

from tests.base import click
from modules.selenium_tools import send_keys, click
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.keys import Keys
from pages.bulk_page import BulkPage
from time import sleep

class BulkPageInventorySku(BulkPage):
    """
    Class is abstraction of Bulk page - Price sub-page

    It provides methods for finding elements, controlling the page and reading various data from the page.
    """
    # Locators
    _name = By.CSS_SELECTOR, 'div.body div.title'
    _product_sku_div = By.CSS_SELECTOR, 'div.property-value-column'
    _product_sku_text = By.CSS_SELECTOR, 'div.read-only-value'
    _product_sku_input = By.CSS_SELECTOR, 'input.value-input-box'
    _input_sku = By.CSS_SELECTOR, 'div.input-wrapper > input'
    _product_rows = By.CSS_SELECTOR, 'div.table-body > div > div.table-row'
    # --------------------------------------------------------

    def __init__(self, driver, ts):
        super().__init__(driver)
        self.ts = ts

    def name(self, box):
        return box.find_element(*self._name).text

    def product_sku_text(self, box):
        return box.find_element(*self._product_sku_text).text

    def product_sku_input(self, box):
        return box.find_element(*self._product_sku_input)

    def product_sku_inputs(self, box):
        return box.find_elements(*self._product_sku_input)

    def sku_input(self):
        return self.driver.find_element(*self._input_sku)

    def rows(self):
        row = By.CSS_SELECTOR, 'bulk-edit-dashboard--table > bulk-edit-dashboard--content > div.table > div.table-wrap > div > div:nth-child(2)'
        self.wait_until_condition(self.driver.find_element(*row).is_displayed, error_message='no product is displayed', attempts=50)
        return self.driver.find_elements(*self._product_rows)

    def sku_input_placeholder(self):
        return self.sku_input().get_attribute('placeholder')

    def product_row_by_name(self, name):
        rows = self.rows()
        for row in rows:
            if name in self.name(row):
                return row

    def change_individual_sku(self, product_name, sku):
        row = self.product_row_by_name(product_name)
        click(row.find_element(By.CSS_SELECTOR, 'div.checkbox'), delay=2)
        sku_text = row.find_element_by_css_selector('div.body div.property-value-column')
        click(sku_text)
        input_individual = self.product_sku_input(row)
        input_individual.clear()
        send_keys(input_individual, sku)
        sleep(0.3)
        click(self.driver.find_element(By.CSS_SELECTOR, '.bulk-edit--selected > div:nth-child(1)'))

    def find_n_replace(self, what, for_what):
        find_input = self.driver.find_element(By.CSS_SELECTOR, 'div.bulk-edit--find input')
        send_keys(find_input, what)
        replace_input = self.driver.find_element(By.CSS_SELECTOR, 'div.bulk-edit--replace input')
        send_keys(replace_input, for_what)

    def set_individual_sku(self, row: WebElement, sku: str, num: int = 0, enter=True):
        """ Sets sku on a listing using inline edit

        :param row: Listing row web element
        :param sku: string value to set as a sku
        :param num: index of sku input, starting from 0 (first sku input)
        :param enter: confirm the sku by pressing Enter after sending keys
        """
        try:
            # click on div to reveal input(s)
            div_elements = row.find_elements(*self._product_sku_div)
            click(div_elements[num])
            # wait at least for first input to show up
            self.wait_for_child_element(row, self._product_sku_input)
            # find input and set the price
            inputs = self.product_sku_inputs(row)
            inputs[num].clear()
            if enter:
                sku = sku + Keys.ENTER
            send_keys(inputs[num], sku)
        except IndexError:
            print('Invalid sku input index: ' + str(num))
            raise
