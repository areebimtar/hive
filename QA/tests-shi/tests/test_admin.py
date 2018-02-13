import pytest
from tests.base import BaseTestClass, run_sql
from pages.login_page import LoginPage
from pages.admin_page import AdminPage
from fixtures.fixtures import test_id
from flaky import flaky
import requests
import arrow


ADMIN_USER = {'user': 'user3', 'password': 'pass3'}


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestAdminPageApi(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        run_sql('HIVE', 'listings_13', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        run_sql('AUTH', 'auth_01', retry=2)
        self.restart_all(self)

        self.api_url_shop_count = self.web_api_url_https + 'admin/shops/counts'

    def api_get_shop_counts(self):
        """ Calls shopCounts web API endpoint to get shop counts

        :return: HTTP status code and data decoded from JSON response
        """

        # we need to use access_token cookie for authorization
        cookie = self.driver.get_cookie('sid')

        if cookie:
            cookies = {cookie['name']: cookie['value']}
        else:
            cookies = dict()

        response = requests.get(self.api_url_shop_count, cookies=cookies)
        return response.status_code, response.json()

    # --- Tests ---

    def test_admin_api_access_denied(self):
        """ Tests that access is denied to admin API to user without admin privileges or unauthorized user
        """

        # Check that non-logged user doesn't have access to admin api
        status_code, content = self.api_get_shop_counts()

        assert status_code == 401
        assert content == {'reason': 'Access Denied!', 'result': 'failed'}

        # Check that logged ordinary user doesn't have access to admin api
        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)
        status_code, content = self.api_get_shop_counts()

        assert status_code == 401
        assert content == {'reason': 'Access Denied!', 'result': 'failed'}

    def test_admin_shop_count(self):
        """ Tests that admin user has access to admin API and that admin page shows correct number of shops
        """

        # Check that logged admin user has access to admin api
        lp = LoginPage(self.driver)
        lp.login(user='user3', password='pass3', page=self.login_url_http)
        status_code, content = self.api_get_shop_counts()

        assert status_code == 200
        assert content == {'etsyShops': 1, 'userShops': 1}

        # Check that admin page displays the shop count value correctly
        ap = AdminPage(self.driver, self.ts)
        ap.open(self.base_url)
        assert ap.etsy_shop_count() == '1'


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestAdminPage(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        run_sql('HIVE', 'listings_13', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        run_sql('AUTH', 'auth_01', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http, **ADMIN_USER)

        ap = AdminPage(self.driver, self.ts)
        ap.open(self.base_url)

    def test_admin_shop_search(self):
        """ Tests admin function for searching a shop and showing its details
        """

        expected_search_results = [
            ['2', '14458117', 'GetvelaTest2', 'check_circle', 'navigate_next']
        ]

        expected_shop_owners = [
            ['1', 'user1', 'navigate_next']
        ]

        # search the shop
        ap = AdminPage(self.driver, self.ts)
        ap.go_to_subpage('Shops')
        ap.search('Getv')

        # check search results
        assert ap.get_search_results() == expected_search_results, 'Shop wasn\'t found as expected'

        # goto shop details and check them
        ap.go_to_search_shop_details('GetvelaTest2')

        assert ap.get_shop_name() == 'GetvelaTest2'
        assert ap.get_shop_id() == '2'
        assert ap.get_shop_channel_id() == '14458117'
        assert ap.get_shop_sync_status() == 'up_to_date'
        data = run_sql('HIVE', 'select_shop_last_sync', True)
        expected_last_sync = arrow.get(data[0][2]).to('local').format('MMM D, YYYY h:mm A')
        assert ap.get_shop_last_sync() == expected_last_sync
        assert ap.get_shop_invalid() == 'false'
        assert ap.get_shop_error() == ''

        # check counts of listings
        assert ap.get_shop_number_of_listings('active') == '3'
        assert ap.get_shop_number_of_listings('draft') == '0'
        assert ap.get_shop_number_of_listings('inactive') == '0'

        # check shop owners
        assert ap.get_shop_owners() == expected_shop_owners
