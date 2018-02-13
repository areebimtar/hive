# Hive Login page
from selenium.webdriver.common.by import By
from time import sleep
from shishito.ui.selenium_support import click_delay
from selenium.common.exceptions import NoSuchElementException
from modules.selenium_tools import click
from pages.base_page import BasePage
from pages.main_page import MainPage

class LoginPage:
    LOGIN_LINK = By.XPATH, "//div[@class='special-page']//a[contains(text(),'Sign In')]"

    def __init__(self, driver):
        self.driver = driver
 
    def user_name(self):
        return self.driver.find_element_by_css_selector('div.form-username-field > input[type="text"]')

    def password(self):
        return self.driver.find_element_by_css_selector('div.form-password-field > input[type="password"]')

    def submit_button(self):
        return self.driver.find_element_by_css_selector('form button')

    def click_login_link(self):
        for i in range(2, -1, -1):
            try:
                e = self.driver.find_element(*self.LOGIN_LINK)
                click(e)
                sleep(1)
                break
            except Exception as e:
                print('Warning cannot click on login link:', e)
                if i == 0:
                    raise

    def login(self, user='user1', password='pass1', page=None):
        if page:
            self.driver.get(page)
            sleep(1)

        self.click_login_link()
        user_input = self.user_name()
        user_input.send_keys(user)
        password_input = self.password()
        password_input.send_keys(password)
        submit_button = self.submit_button()
        click(submit_button)

        # wait for main page to load
        mp = MainPage(self.driver)
        BasePage.wait_until_condition(lambda: mp.is_displayed(), 'Main page is not displayed', attempts=2)

    def reset_link(self):
        return self.driver.find_element_by_css_selector('form div.form-password-field a.reset-password')

    def reset_password_input(self):
        return self.driver.find_element_by_css_selector('form div input')

    def reset_password_button(self):
        return self.driver.find_element_by_xpath("//form//button[contains(text(),'Send Reset Link')]")

    @click_delay
    def create_account(self):
        return self.driver.find_element_by_css_selector("div.links > a.account")

    def go_to_etsy(self):
        self.driver.find_element(By.XPATH, "//div[@class=' no-shops']//button[contains(text(),'Go to Etsy')]").click()

    def wait_during_sync_from_etsy(self):
        self.driver.find_element(By.CSS_SELECTOR, "div.special-page.intro-page")
        for _ in range(0, 120):
            try:
                self.driver.find_element(By.CSS_SELECTOR, "div.special-page.intro-page")
            except NoSuchElementException:
                break
            sleep(1)
        else:
            raise Exception('Time is up - etsy sync not finished in time')
