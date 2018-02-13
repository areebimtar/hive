# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, click, run_sql
from modules.selenium_tools import send_keys, click
from pages.main_page import MainPage
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky
import os
import imaplib
import email
import re
from enum import Enum


class Whitespaces(Enum):
    yes = 0
    no = 1


@pytest.mark.skip(reason='we need to investigate mandrill, mails not working')
@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestResetPassword(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)
        self.stop_all()
        run_sql('AUTH', 'auth_01', retry=2)
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        self.driver.get(self.login_url_http)
        self.user1 = {'email': 'getvela.test@gmail.com', 'name': 'Tester GetVela', 'password': os.environ['QA_GETVELA_MAIL_PASSWORD']}

        for var in ['QA_GETVELA_MAIL_PASSWORD']:
            if var not in os.environ:
                raise Exception("Error: '" + var + "' environment variable is not set")

    def clean_email(self, user):
        """Clean the inbox of given user (Gmail account supported at this moment)"""
        M = imaplib.IMAP4_SSL('imap.gmail.com')
        M.login(user['email'], user['password'])
        M.select()  # Select Inbox by default
        typ, data = M.search(None, 'ALL')
        for num in data[0].split():
            typ, data = M.fetch(num, '(RFC822)')
            M.store(num, '+FLAGS', '\\Deleted')
        M.expunge()
        M.close()
        M.logout()

    def reset_password_received(self, user, attempts=5, delay=3):
        """Check the inbox of given user for reset password (Gmail account supported at this moment)"""

        email_subject = "Password reset"
        url = None

        M = imaplib.IMAP4_SSL('imap.gmail.com')
        M.login(user['email'], user['password'])

        for attempt in range(attempts):
            sleep(delay)

            M.select()
            typ, data = M.search(None, 'SUBJECT \"' + email_subject + '\"')
            if len(data) == 0 or data == [b'']:
                pass
            else:
                for num in data[0].split():
                    typ, data = M.fetch(num, '(RFC822)')
                    raw_email = data[0][1]

                    msg = email.message_from_bytes(raw_email)
                    payload = msg.get_payload()

                    # email payload can be single string or multiple objects with their own payloads
                    if not isinstance(payload, str):
                        all_payloads = [p.get_payload() for p in payload]
                        payload = "".join(all_payloads)

                    m = re.search('To reset your password, please follow this link: (http[^ \n\r]+)', payload)
                    if m is not None:
                        url = m.group(1)
                        break

        M.close()
        M.logout()

        return url

    # --- Tests ---

    @pytest.mark.parametrize('test_whitespaces', [Whitespaces.no, Whitespaces.yes])
    def test_reset_password_ok(self, test_whitespaces):
        """ Tests that the user can reset a password
        """
        new_pass = 'new-pass-123'
        d = self.driver
        lpg = LoginPage(d)

        lpg.click_login_link()
        click(lpg.reset_link())
        sleep(2)

        # enter e-mail address for password reset
        input_field = lpg.reset_password_input()
        submit_btn = lpg.reset_password_button()

        self.clean_email(self.user1)

        email_text = self.user1['email']
        if test_whitespaces == Whitespaces.yes:
            # the case when whitespaces are around email in input field
            email_text = '  ' + email_text + ' '
        send_keys(input_field, email_text)
        click(submit_btn)

        # check for e-mail, extract URL from it
        url = self.reset_password_received(self.user1)
        assert url is not None, 'Reset password link not found in mailbox'

        # Go to the URL from the email
        d.get(url)
        sleep(1)

        # Fill in the new password
        p1 = d.find_element_by_css_selector('form input[name="password"]')
        p2 = d.find_element_by_css_selector('form input[name="password2"]')
        btn = d.find_element_by_xpath("//form//button[contains(text(),'Reset Password')]")
        send_keys(p1, new_pass)
        send_keys(p2, new_pass)
        sleep(1)
        click(btn)
        sleep(2)

        # Login with the new password
        d.get(self.base_url)

        lpg = LoginPage(d)
        lpg.login(page=self.login_url_http)
        mp = MainPage(d)
        assert mp.is_displayed(), 'Login failed, main page is not displayed'
