from selenium.webdriver import Remote
from selenium.webdriver.common.by import By
from modules.selenium_tools import click


class WelcomePage(object):
    SIGN_IN_LOCATOR = By.CSS_SELECTOR, 'div.accounts > a.sign'

    def __init__(self, driver: Remote):
        self.driver = driver

    @property
    def sing_in_link(self):
        return self.driver.find_element(*self.SIGN_IN_LOCATOR)

    def sign_in(self, page=None):
        if page:
            self.driver.get(page)
        click(self.sing_in_link)
