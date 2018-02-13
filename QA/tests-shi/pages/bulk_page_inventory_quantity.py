

from tests.base import click
from modules.selenium_tools import send_keys, click
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from pages.bulk_page import BulkPage
from selenium.webdriver.common.keys import Keys


class BulkPageInventoryQuantity(BulkPage):
    """
    Class is abstraction of Bulk page - quantity sub-page

    It provides methods for finding elements, controlling the page and reading various data from the page.
    """
    # Locators
    _name = By.CSS_SELECTOR, 'div.body div.title'
    _product_quantity_global_status = By.CSS_SELECTOR, 'div.offering-list > div'
    _product_quantity_text = By.CSS_SELECTOR, 'div.read-only-value'
    _product_quantity_div = By.CSS_SELECTOR, 'div.property-value-column'
    _product_quantity_input = By.CSS_SELECTOR, 'input.value-input-box'
    _input_quantity = By.CSS_SELECTOR, 'div.input-wrapper > input'
    _product_rows = By.CSS_SELECTOR, 'div.table-body > div > div.table-row'
    _options = By.CSS_SELECTOR, 'div.option-row'
    _offering_list = By.CSS_SELECTOR, 'div.offering-list'
    # --------------------------------------------------------

    def __init__(self, driver, ts):
        super().__init__(driver)
        self.ts = ts

    def name(self, box):
        return box.find_element(*self._name).text

    def product_quantity_global_error(self, row):
        element = row.find_element(*self._product_quantity_global_status)
        if 'global-status' in element.get_attribute('class'):
            return element.text
        else:
            return ''

    def product_quantity_text(self, box):
        return box.find_element(*self._product_quantity_text).text

    def product_quantity_input(self, box):
        return box.find_element(*self._product_quantity_input)

    def product_quantity_inputs(self, box):
        return box.find_elements(*self._product_quantity_input)

    def quantity_input(self):
        return self.driver.find_element(*self._input_quantity)

    def rows(self):
        row = By.CSS_SELECTOR, 'bulk-edit-dashboard--table > bulk-edit-dashboard--content > div.table > div.table-wrap > div > div:nth-child(2)'
        self.wait_until_condition(self.driver.find_element(*row).is_displayed, error_message='no product is displayed', attempts=50)
        return self.driver.find_elements(*self._product_rows)

    def quantity_input_placeholder(self):
        return self.product_quantity_input().get_attribute('placeholder')

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
        """ Check whether listing has a global quantity or individual quantities

        :param row: Web element of listing row
        :return: True if listing has individual quantities, False otherwise
        """
        element = row.find_element(*self._offering_list)
        return 'global' not in element.get_attribute('class')

    def options_quantity_individual(self, box):
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
                res[self.name(r)] = self.product_quantity_text(r)
            else:
                # options with individual quantitys
                res[self.name(r)] = self.options_quantity_individual(r)
        return res

    def set_individual_quantity(self, row: WebElement, quantity: str, num: int = 0, enter=True):
        """ Sets price on a listing using inline edit

        :param row: Listing row web element
        :param quantity: string value to set as a quantity
        :param num: index of quantity input, starting from 0 (first quantity input)
        :param enter: confirm the quantity by pressing Enter after sending keys
        """
        try:
            # click on div to reveal input(s)
            div_elements = row.find_elements(*self._product_quantity_div)
            click(div_elements[num])
            # wait at least for first input to show up
            self.wait_for_child_element(row, self._product_quantity_input)
            # find input and set the quantity
            inputs = self.product_quantity_inputs(row)
            inputs[num].clear()
            if enter:
                quantity = quantity + Keys.ENTER
            send_keys(inputs[num], quantity)
        except IndexError:
            print('Invalid quantity input index: ' + str(num))
            raise
