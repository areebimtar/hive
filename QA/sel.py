#!/home/jirkat/my-proj/py-test/env-selenium/bin/python3

import unittest
import sys, os
from selenium import webdriver
from subprocess import call
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

USE_REMOTE_DRIVER = 1
REMOTE_DRIVER_URL = 'http://127.0.0.1:4444/wd/hub'
DB_DIR = os.path.dirname(__file__) + '/sql'


class SelTest(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Remote(command_executor=REMOTE_DRIVER_URL, desired_capabilities={'platform': 'ANY', 'browserName': 'firefox', 'version': '', 'marionette': False, 'javascriptEnabled': True})
        for n in {'PGHOST': 'hive_db00', 'PGPORT': '5432', 'PGDATABASE': 'hive_listings', 'PGUSER': 'hiveusr', 'PGPASSWORD': 'hiveusr_password'}.items():
            os.environ[n[0]] = n[1]
        call(['sh', '-c', 'psql -v ON_ERROR_STOP=1 < ' + DB_DIR + '/one_prod.sql > /dev/null'])


    def test_sel_search(self):
            # Expected nested <UL> list 
        expectedCategories = [
                {'catName': 'Clothing',
                    'options': ['Cool', 'New']
                },
                {'catName': 'Computers',
                    'options': ['Cool']
                }
        ]
        d = self.driver

        d.get("http://hive_node00")
        categoryObjects = d.find_elements_by_css_selector('div.leftmenu > ul.properties > li')
        for i in range (0, len(categoryObjects)):
            c = categoryObjects[i]
            categoryName = c.find_elements_by_css_selector('span')[0].text;
            assert categoryName == expectedCategories[i]['catName']
            options = [t.text for t in c.find_elements_by_css_selector("li")]
            assert options == expectedCategories[i]['options']

    def tearDown(self):
        self.driver.close()


unittest.main(verbosity=10)
