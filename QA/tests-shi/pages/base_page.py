#  Hive base page - base for all pages
from time import sleep
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException, WebDriverException
from modules.selenium_tools import click


class DropdownException(Exception):
    pass

class WaitUntilError(Exception):
    pass

class BasePage(object):
    def __init__(self, driver):
        self.driver = driver

    def wait_for_child_element(self, parent, locator):
        WebDriverWait(self.driver, 5).until(
            lambda driver: parent.find_element(*locator).is_displayed()
        )
        return parent.find_element(*locator)

    @staticmethod
    def wait_until_condition(condition_function, error_message='', attempts=10):

        for i in range(attempts, 0, -1):
            try:
                if condition_function():
                    break
            except WebDriverException:
                if i == 1:
                    raise
            sleep(1)
            print('Waiting - attempt:', i)
        else:
            raise WaitUntilError('No attempts left: ' + error_message)

    def is_dropdown_open(self, element, individual_dropdown=False):
        if individual_dropdown:
            item = element.find_element_by_css_selector('div.bulk-edit-dropdown')
            return item.is_displayed()
        else:
            item = element.find_element_by_css_selector('div.rw-dropdownlist')
            return item.get_attribute('aria-expanded') == 'true'

    def is_dropdown_closed(self, element, individual_dropdown=False):
        if individual_dropdown:
            items = element.find_elements_by_css_selector('div.bulk-edit-dropdown')
            return len(items) == 0
        else:
            items = element.find_elements_by_css_selector('div.rw-popup')
            if len(items) == 0:
                return True
            return not items[0].is_displayed()

    def open_dropdown(self, element, individual_dropdown=False):
        if individual_dropdown:
            click(element)
        else:
            click(element_parent=element, locator=(By.XPATH, 'div[@role="combobox"]'))
        self.wait_until_condition(lambda: self.is_dropdown_open(element, individual_dropdown) is True, 'Dropdown is not open')

    def find_value_in_dropdown(self, element, value):
        def _value_found(_items):
            _items += [i for i in element.find_elements_by_css_selector('ul li') if i.text == value]
            return len(_items) > 0

        items = []
        self.wait_until_condition(lambda: _value_found(items) is True, 'Value not found in dropdown: {}'.format(value))
        return items[0]

    def scroll_to_value_in_dropdown(self, value_element):
        self.driver.execute_script("arguments[0].scrollIntoView(false)", value_element)
        self.wait_until_condition(lambda: value_element.is_displayed() and value_element.is_enabled(), 'Value is not visible and enabled')

    def select_from_dropdown_by_value(self, value, element, individual_dropdown=False, wait_until_closed=True):
        """ Select a value from a dropdown

        :param value: Value to select in dropdown
        :param element: Top element of a dropdown to search sub elements from.
            It is necessary that this element doesn't change in DOM during select operation
        :param individual_dropdown: bool - True if dropdown is of a special type
        :return:
        """
        try:
            self.open_dropdown(element, individual_dropdown)
            value_element = self.find_value_in_dropdown(element, value)
            self.scroll_to_value_in_dropdown(value_element)
            value_element = self.find_value_in_dropdown(element, value)
            click(value_element)
            if wait_until_closed:
                self.wait_until_condition(lambda: self.is_dropdown_closed(element, individual_dropdown) is True, 'Dropdown is not closed')
        except (WaitUntilError, WebDriverException) as e:
            print('Dropdown error: ', value, 'cannot be selected.', e.args)
            raise

    def scroll_to_element(self, element_locator, align_to_top=False):
        boolvalue_js = 'true' if align_to_top else 'false'
        self.driver.execute_script("arguments[0].scrollIntoView({});".format(boolvalue_js), element_locator)
        sleep(1)


    # return [1, 20 , 45] for "1-20 of 45"
    def page_nums(self, css_selector, page_indexes):
        d = self.driver
        max_index = page_indexes[-1]
        for attempt in range(3, -1, -1):
            try:
                pages = d.find_elements_by_css_selector(css_selector)
                if len(pages) > max_index:
                    return [ int(pages[i].text) for i in page_indexes ]
                print("Error getting page numbers. attempt:", attempt)
                sleep(1)
            except Exception as e:
                print("Error getting page_nums:", e.args)
                if attempt <= 0:
                    raise
        else:
                raise Exception("Error getting page numbers. pages:", pages)

