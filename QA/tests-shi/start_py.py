from shishito.shishito_runner import ShishitoRunner
import unittest
import sys, os
from selenium import webdriver
from selenium.webdriver.common.by import By
import unittest
import sys, os
from selenium import webdriver
import requests
from time import sleep
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from pages.bulk_page import BulkPage
from pages.main_page import MainPage

d = webdriver.Firefox()
class self:
    driver = d

pg = MainPage(d)
bp = BulkPage(d)
url = 'http://hive_test_00.salsitasoft.com:4082'
d.get(url)
user = d.find_element_by_css_selector('form > div:nth-child(1) > input')
passwd = d.find_element_by_css_selector('form > div:nth-child(2) > input')
user.send_keys('user1')
passwd.send_keys('pass1')
d.find_element_by_css_selector('form button').click()
sleep(2)

