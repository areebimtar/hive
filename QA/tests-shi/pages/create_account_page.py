# Hive Login page
from selenium.webdriver.common.by import By
from time import sleep
from shishito.ui.selenium_support import click_delay

class CreateAccountPage:
    def __init__(self, driver):
        self.driver = driver

    def firstname(self):
        return self.driver.find_element_by_css_selector('form input[name="firstname"]')

    def lastname(self):
        return self.driver.find_element_by_css_selector('form input[name="lastname"]')

    def email(self):
        return self.driver.find_element_by_css_selector('form input[name="email"]')

    def password(self):
        return self.driver.find_element_by_css_selector('form input[name="password"]')

    def password2(self):
        return self.driver.find_element_by_css_selector('form input[name="password2"]')

    @click_delay
    def submit_button(self):
        return self.driver.find_element_by_css_selector('form button')

    @click_delay
    def sign_in(self):
        return self.driver.find_element_by_xpath("//div[@class='tabs']/a[contains(text(),'Sign In')]")
