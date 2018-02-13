# /usr/bin/env python
import pytest
from unittestzero import Assert
from shishito.runtime.shishito_support import ShishitoSupport
from shishito.ui.selenium_support import SeleniumTest
from shishito.conf.conftest import get_test_info
from selenium.webdriver.support import expected_conditions as cond
from pages.main_page import MainPage
from time import sleep
from base import BaseTestClass;

@pytest.mark.usefixtures("test_status")
class TestMainPage(BaseTestClass):

    ### Tests ###
    @pytest.mark.smoke
    def test_title(self):
        d = self.driver
        assert d.title == ('QA Hello')

    def test_names_db1(self):
        d = self.driver
        self.run_sql('00', 'names_01')

        d.get(self.base_url)
        names = d.find_element_by_css_selector('div#db')
        assert names.text == 'Anna, Hana, Pepa'

    def test_names_db2(self):
        d = self.driver
        self.run_sql('00', 'names_02')

        d.get(self.base_url)
        names = d.find_element_by_css_selector('div#db')
        #assert names.text == 'Anna, Hana, Pepa'
        assert names.text == 'Jana, Tereza'

    def test_web_tc1(self):
        d = self.driver
        self.set_etsy_testcase('tc1')

        d.get(self.base_url)
        web = d.find_element_by_css_selector('div#web')
        assert web.text == 'Test case #42'

    def test_web_tc2(self):
        d = self.driver
        self.set_etsy_testcase('tc2')

        d.get(self.base_url)
        web = d.find_element_by_css_selector('div#web')
        assert web.text == 'Test case #2'
