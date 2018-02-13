# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import wait_for_assert
from pages.login_page import LoginPage
from pages.main_page import MainPage
from flaky import flaky


@pytest.mark.usefixtures("test_status")
@flaky
class TestEtsyShop(BaseTestClass):

    # --- Tests ---

    def test_etsy_shop_vacation(self):
        """ Test verifies that sync of a shop in vacation mode results in marking the shop as invalid
        and displaying proper message to user.
        Introduced in HIVE-966.
        """

        expected_db_data_queue = [
            ['1', 'syncShop', '2', 'aborted', '']
        ]

        expected_db_shop_status = [
            ['GetvelaTest2', 'incomplete_shop_sync_in_vacation_mode', 't', '']
        ]

        expected_vacation_mode_message = """Vacation Mode
It appears that your shop is in or was was recently brought out of “Vacation Mode”. When a shop is in “Vacation Mode”, \
Etsy takes it offline, which prevents Vela (or any apps) from being able to connect to it
Once you bring it back online, there is typically a 4 hour delay between the listings appearing on Etsy and then being \
reflected in Vela, but at that point everything should match up and you'll be free to edit.
Hopefully this provides a little clarity, but if you have any questions, please feel free to reach out by clicking the \
blue chat icon (bottom right hand corner) or via email at contact@getvela.com"""

        self.stop_all()
        self.set_etsy_testcase('listings_shop_vacation')
        run_sql('HIVE', 'listings_10', retry=2)
        self.restart_all()

        # check that sync task is aborted
        wait_for_assert(
            expected_db_data_queue,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected',
            retries=30)

        # check that shop was marked invalid and why
        shop_status = run_sql('HIVE', 'select_shop_status', True)
        assert expected_db_shop_status == shop_status

        # check vacation mode message
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        vacation_mode_message = mp.invalid_shop_text()
        assert expected_vacation_mode_message == vacation_mode_message
