# /usr/bin/env python
import pytest
from time import sleep, time, localtime
from tests.base import BaseTestClass, click, run_sql
from modules.selenium_tools import send_keys, click
from pages.login_page import LoginPage
from pages.main_page import MainPage
from pages.create_account_page import CreateAccountPage
from fixtures.fixtures import test_id
from flaky import flaky
import os
from enum import Enum
import arrow


class Whitespaces(Enum):
    yes = 0
    no = 1


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestLogin(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)
        self.driver.get(self.login_url_http)

    # --- Tests ---

    def test_login_err(self):
        """ Tests that the user cannot log in with incorrect password
        """
        d = self.driver
        lpg = LoginPage(d)
        lpg.click_login_link()

        user_name = lpg.user_name()
        password = lpg.password()
        submit = lpg.submit_button()

        send_keys(user_name, 'user1')
        send_keys(password, 'foo')
        click(submit)
        sleep(1)
        assert 'Username or password incorrect' in d.page_source

    # --------------------------------------------------------------------------------
    def test_login_ok(self):
        """ Tests that the user can successfully log in
        """

        d = self.driver
        lpg = LoginPage(d)
        lpg.click_login_link()

        user_name = lpg.user_name()
        password = lpg.password()
        submit = lpg.submit_button()

        send_keys(user_name, 'user1')
        send_keys(password, 'pass1')
        click(submit)
        sleep(2)
        assert os.environ['QA_PRODUCT_HOST'] in d.current_url
        assert d.title == 'Vela'

    def test_createaccount_url(self):
        """ Tests that the /createaccount url leads to Create Account tab
        """
        d = self.driver
        d.get(self.login_url_https + "createAccount")
        sleep(2)
        cap = CreateAccountPage(d)

        assert cap.submit_button().text == 'Create Account'


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestAccount(BaseTestClass):

    @pytest.mark.parametrize("test_whitespaces", [Whitespaces.no, Whitespaces.yes])
    def test_create_account(self, test_whitespaces):
        """ Tests that the user can create an account and log in with it
        """
        d = self.driver
        cap = CreateAccountPage(d)
        self.stop_all()
        self.set_etsy_testcase('listings_09')
        run_sql('AUTH', 'auth_01', retry=2)
        self.restart_all()

        # go to create account page
        d.get(self.login_url_https + "createAccount")
        sleep(1)

        # create account
        send_keys(cap.firstname(), 'Test')
        send_keys(cap.lastname(), 'User')
        email_text = 'test.user@example.com'
        if test_whitespaces == Whitespaces.yes:
            # the case when whitespaces are around email in input field
            email_text = '   ' + email_text + ' '
        send_keys(cap.email(), email_text)
        send_keys(cap.password(), 'secret123')
        send_keys(cap.password2(), 'secret123')
        click(cap.submit_button())

        # check DB
        db_data = run_sql('AUTH', 'select_test_user', True)
        assert db_data == [['Test', 'User']]

        # log in using the new account
        d.delete_all_cookies()
        lp = LoginPage(d)
        lp.login(user='test.user@example.com', password='secret123', page=self.login_url_http)
        mp = MainPage(d)
        assert mp.is_displayed(), 'Login failed, main page is not displayed'


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestLoginRecord(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)
        self.stop_all()
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        run_sql('AUTH', 'auth_01', retry=2)
        self.restart_all()
        self.driver.get(self.login_url_http)

    def test_login_record(self):
        """ Tests that the timestamp is recorder on login
        """
        d = self.driver
        lpg = LoginPage(d)

        # first login
        lpg.login(page=self.login_url_http)
        today = arrow.utcnow().floor('day')

        # check DB
        db_data = run_sql('AUTH', 'select_login_time', True)
        print("db_data=", db_data)
        first_login_day = arrow.get(db_data[0][0]).to('utc').floor('day')
        assert first_login_day == today
        assert db_data[0][0] == db_data[0][1]

        # log in again
        self.tc.stop_browser()
        self.driver = self.tc.start_browser()
        d = self.driver
        d.get(self.base_url)
        sleep(2)

        lpg = LoginPage(d)
        lpg.login(page=self.login_url_http)
        today = arrow.utcnow().floor('day')

        # check DB
        db_data = run_sql('AUTH', 'select_login_time', True)
        print("db_data=", db_data)
        first_login_day = arrow.get(db_data[0][0]).to('utc').floor('day')
        last_login_day = arrow.get(db_data[0][1]).to('utc').floor('day')
        assert first_login_day == today
        assert last_login_day == today
        # first login timestamp != last login timestamp
        assert db_data[0][0] != db_data[0][1]
        # login count
        assert db_data[0][2] == '2'
