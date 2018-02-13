

from tests.base import click
from modules.selenium_tools import send_keys, click
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.keys import Keys
from pages.bulk_page import BulkPage

class BulkPageInventoryPrice(BulkPage):
    """
    Class is abstraction of Bulk page - Price sub-page

    It provides methods for finding elements, controlling the page and reading various data from the page.
    """
    # Locators
    _name = By.CSS_SELECTOR, 'div.body div.title'
    _product_price_text = By.CSS_SELECTOR, 'div.read-only-value'
    _product_price_div = By.CSS_SELECTOR, 'div.property-value-column'
    _product_price_input = By.CSS_SELECTOR, 'input.value-input-box'
    _input_price = By.CSS_SELECTOR, 'div.input-wrapper > input'
    _product_rows = By.CSS_SELECTOR, 'div.table-body > div > div.table-row'
    _options = By.CSS_SELECTOR, 'div.option-row'
    _offering_list = By.CSS_SELECTOR, 'div.offering-list'
    # --------------------------------------------------------

    def __init__(self, driver, ts):
        super().__init__(driver)
        self.ts = ts

    def name(self, box):
        return box.find_element(*self._name).text

    def product_price_text(self, box):
        return box.find_element(*self._product_price_text).text

    def product_price_input(self, box):
        return box.find_element(*self._product_price_input)

    def product_price_inputs(self, row):
        return row.find_elements(*self._product_price_input)

    def price_input(self):
        return self.driver.find_element(*self._input_price)

    def rows(self):
        row = By.CSS_SELECTOR, 'bulk-edit-dashboard--table > bulk-edit-dashboard--content > div.table > div.table-wrap > div > div:nth-child(2)'
        self.wait_until_condition(self.driver.find_element(*row).is_displayed, error_message='no product is displayed', attempts=50)
        return self.driver.find_elements(*self._product_rows)

    def price_input_placeholder(self):
        return self.product_price_input().get_attribute('placeholder')

    def product_row_by_name(self, name):
        rows = self.rows()
        for row in rows:
            if name in self.name(row):
                return row

    def option_rows(self, box):
        return box.find_elements(*self._options)

    def options_visibility(self, row):
        """ Return visibility/non visibility of all offerings on a listing row

        :param row: listing row web element
        :return: (non) visibility of offerings as array of bool
        """
        return ['not-visible' not in option.get_attribute('class') for option in self.option_rows(row)]

    def individual(self, row):
        """ Check whether listing has a global price or individual prices

        :param row: Web element of listing row
        :return: True if listing has individual prices, False otherwise
        """
        element = row.find_element(*self._offering_list)
        return 'global' not in element.get_attribute('class')

    def options_prices_individual(self, box):
        res = []
        options = self.option_rows(box)

        for o in options:
            arr = o.text.split('\n')
            res.append(tuple(arr))
        return res

    def listing_details(self):
        res = {}

        rows = self.rows()
        for r in rows:
            if not self.individual(r):
                # no option
                res[self.name(r)] = self.product_price_text(r)
            else:
                # options with individual prices
                res[self.name(r)] = self.options_prices_individual(r)
        return res

    def set_individual_price(self, row: WebElement, price: str, num: int=0, enter=True):
        """ Sets price on a listing using inline edit

        :param row: Listing row web element
        :param price: string value to set as a price
        :param num: index of price input, starting from 0 (first price input)
        :param enter: confirm the price by pressing Enter after sending keys
        """
        try:
            # click on div to reveal input(s)
            div_elements = row.find_elements(*self._product_price_div)
            self.scroll_to_element(div_elements[num], True)
            click(div_elements[num])
            # wait at least for first input to show up
            self.wait_for_child_element(row, self._product_price_input)
            # find input and set the price
            inputs = self.product_price_inputs(row)
            inputs[num].clear()
            if enter:
                price = price + Keys.ENTER
            send_keys(inputs[num], price)
        except IndexError:
            print('Invalid price input index: ' + str(num))
            raise
