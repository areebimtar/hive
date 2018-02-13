# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from pages.main_page import MainPage
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestSpecialChars(BaseTestClass):

    # --- Tests ---

    def test_html_chars(self):
        self.set_etsy_testcase('listings_04')
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        self.restart_all()

        d = self.driver
        pg = MainPage(d)

        # Wait for shops to download
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        lpg.go_to_etsy()

        lpg.wait_during_sync_from_etsy()

        d.get(self.base_url)

        # get titles
        titles = pg.listing_titles_sorted()
        my_title = [x for x in titles if 'Special chars' in x][0]
 
        assert my_title == 'Special chars & <> to see here2 Здравствуй žkrůňě'
