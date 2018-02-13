#  Hive bulk edit page - inventory variations sub-page
from tests.base import click
from modules.selenium_tools import send_keys, click
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from pages.bulk_page import BulkPage
from typing import List

class BulkPageInventoryVariations(BulkPage):
    """
    Class is abstraction of Bulk page - Inventory Variations sub-page

    It provides methods for finding elements, controlling the page and reading various data from the page.
    """
    BULK_EDIT_AREA_LOCATOR = (By.CSS_SELECTOR, 'div.bulk-edit--controls')
    BULK_EDIT_ROW_LOCATOR = (By.CSS_SELECTOR, 'div.bulk-edit--controls div.inventory-wrapper')
    CATEGORY_NAMES_LOCATOR = (By.CSS_SELECTOR, 'div.taxonomy-preview > span.taxonomy')
    INVENTORY_TABS_LOCATOR = (By.CSS_SELECTOR, 'div.tabs-links > div.tab')
    OFFERING_OPTIONS_BOX_LOCATOR = (By.CSS_SELECTOR, 'div.offering-property-options')
    ADD_ALL_OPTIONS_LOCATOR = By.XPATH, '//*[contains(text(), "Add All")]'
    OPTION_ADD_BUTTON_LOCATOR = (By.CSS_SELECTOR, 'div.add-option-combo > button:nth-child(2)')
    OPTION_COMBO_LOCATOR = (By.CSS_SELECTOR, 'div.add-option-combo')
    OPTION_DELETE_LOCATOR = (By.CSS_SELECTOR, 'div.delete-column.option-delete')
    OPTION_INPUT_LOCATOR = (By.CSS_SELECTOR, 'div.add-option-combo input')
    OPTION_NAMES_LOCATOR = (By.CSS_SELECTOR, 'div.variation-item-options div.variation-item-option-name')
    PROPERTY_BOXES_LOCATOR = (By.CSS_SELECTOR, 'div.variation-items-wrapper > div')
    PROPERTY_DROPDOWN_LOCATOR = By.CSS_SELECTOR, 'div.property > div.value'
    PROPERTY_SETTINGS_LOCATOR = (By.CSS_SELECTOR, 'div.variation-item-settings div.rw-input')
    PROPERTY_INPUT = (By.CSS_SELECTOR, 'div.add-new-input > input')
    PROPERTY_ADD_BUTTON = (By.CSS_SELECTOR, 'div.add-new > button')
    PROPERTY_DELETE_CROSS = By.CSS_SELECTOR, 'div.delete-variation-item'
    SCALE_DROPDOWN_LOCATOR = By.CSS_SELECTOR, 'div.scale > div.value'
    BULK_EDIT_GLOBAL_PRICE_INPUT = By.CSS_SELECTOR, 'div.bulk-edit--controls input.value-input-box'
    BULK_EDIT_GLOBAL_QUANTITY_INPUT = By.CSS_SELECTOR, 'div.bulk-edit--controls input.value-input-box'
    BULK_EDIT_GLOBAL_SKU_INPUT = By.CSS_SELECTOR, 'div.bulk-edit--controls input.value-input-box'
    GLOBAL_PRICE_INPUT = By.CSS_SELECTOR, 'div.global-value input.value-input-box'
    GLOBAL_QUANTITY_INPUT = By.CSS_SELECTOR, 'div.global-value input.value-input-box'
    GLOBAL_SKU_INPUT = By.CSS_SELECTOR, 'div.global-value input.value-input-box'

    HEADER_ERROR = By.CSS_SELECTOR, 'div.header-bar div.error'

    BULK_PREVIEW_ROW_LEFT_HEADER = By.CSS_SELECTOR, 'div.tab-body div.header-bar div.left-header span'
    BULK_PREVIEW_ROW_RIGHT_HEADER = By.CSS_SELECTOR, 'div.tab-body div.header-bar div.right-header span'
    BULK_PREVIEW_ROW_LEFT_OPTIONS = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(1) div.option-row > div'
    BULK_PREVIEW_ROW_RIGHT_OPTIONS = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(2) div.option-row > div'
    BULK_PREVIEW_ROW_LEFT_TOGGLES = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(1) div.option-row > div.property-value-column > div.read-only-value'
    BULK_PREVIEW_ROW_RIGHT_TOGGLES = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(2) div.option-row > div.property-value-column > div.read-only-value'

    BULK_EDIT_HEADER_LEFT = By.CSS_SELECTOR, 'div.header-bar div.left-header'
    BULK_EDIT_HEADER_RIGHT = By.CSS_SELECTOR, 'div.header-bar div.right-header'
    BULK_EDIT_HEADER_LEFT_CHECKBOX = By.CSS_SELECTOR, 'div.header-bar div.left-header div.check-box-wrapper'
    BULK_EDIT_HEADER_RIGHT_CHECKBOX = By.CSS_SELECTOR, 'div.header-bar div.right-header div.check-box-wrapper'

    BULK_EDIT_OPTION_INPUTS_LEFT = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(1) div.option-row input'
    BULK_EDIT_OPTION_INPUTS_RIGHT = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(2) div.option-row input'
    BULK_EDIT_OPTION_TOGGLES_LEFT = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(1) div.option-row div.hive-toggle'
    BULK_EDIT_OPTION_TOGGLES_RIGHT = By.CSS_SELECTOR, 'div.items-wrapper div.offering-property-item:nth-of-type(2) div.option-row div.hive-toggle'

    def __init__(self, driver, ts):
        super().__init__(driver)
        self.ts = ts

    def is_bulk_edit_visible(self) -> bool:
        """ Checks whether bulk edit area is visible (present in DOM)

        :return: True or False
        """
        return self.ts.is_element_present(self.BULK_EDIT_ROW_LOCATOR)

    @property
    def bulk_edit_area(self) -> WebElement:
        """ Finds and returns bulk edit area element

        :return: Bulk edit are element
        """
        return self.driver.find_element(*self.BULK_EDIT_AREA_LOCATOR)

    def is_option_combobox_open(self, element: WebElement) -> bool:
        """ Checks whether option combobox is open

        :param element: option combo element (div.rw-input must be its child)
        :return: True or False
        """
        return 'rw-open' in element.find_element_by_class_name('rw-combobox').get_attribute('class')

    def add_all_options(self, row: WebElement, i: int):
        """ Adds all variation property predefined options

        :param box: variation property box element
        """
        orig_count = self.options_count(row, i)
        box = self.property_box(row, i)
        click(element_parent=box, locator=self.OPTION_COMBO_LOCATOR)
        option_combo = box.find_element(*self.OPTION_COMBO_LOCATOR)
        self.wait_until_condition(lambda: self.is_option_combobox_open(option_combo) is True)
        click(element_parent=box, locator=self.ADD_ALL_OPTIONS_LOCATOR)
        self.wait_until_condition(lambda: self.options_count(row, i) > orig_count)

    def add_custom_option(self, row: WebElement, i: int, name: str):
        """ Adds custom option to a variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :param name: name of the custom option to be added
        """

        orig_names = self.options_names_texts(row, i)
        box = self.property_box(row, i)
        click(element_parent=box, locator=self.OPTION_INPUT_LOCATOR)
        option_input = self.option_input(row, i)
        send_keys(option_input, name)
        click(element_parent=box, locator=self.OPTION_ADD_BUTTON_LOCATOR)
        # wait until option names are updated
        self.wait_until_condition(lambda: orig_names != self.options_names_texts(row, i), 'Options are still the same')

    def add_option(self, row: WebElement, i: int, name: str, displayed_name: str = None):
        """ Adds predefined option to a variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :param name: name of the predefined option to be added
        """
        box = self.property_box(row, i)
        option_combo = box.find_element(*self.OPTION_COMBO_LOCATOR)
        click(element_parent=box, locator=self.OPTION_INPUT_LOCATOR)
        self.wait_until_condition(lambda: self.is_option_combobox_open(option_combo) is True)
        list_of_options = box.find_element(By.CSS_SELECTOR, 'div.rw-popup-container')
        possible_items = list_of_options.find_elements(By.XPATH, '//ul/li/div[contains(text(), "' + name + '")]')
        try:
            for item in possible_items:
                if item.text == name:
                    option_item = item
                    break
        except:
            option_item = possible_items
        self.scroll_to_element(option_item, False)
        click(option_item)
        if displayed_name is None:
            displayed_name = name
        self.wait_until_condition(lambda: displayed_name in self.options_names_texts(row, i))

    @property
    def bulk_edit_row(self) -> WebElement:
        """ Finds and returns row in Variations bulk edit area
        :return: bulk edit area row
        """
        return self.driver.find_element(*self.BULK_EDIT_ROW_LOCATOR)

    def category_texts(self, row: WebElement) -> List[str]:
        """ Return category texts from a listing row
        :param row: listing row element
        :return: category as a list of subcategories
        """
        cat_el = row.find_elements(*self.CATEGORY_NAMES_LOCATOR)
        return [e.text for e in cat_el]

    def delete_option(self, row: WebElement, i: int, option_index: int):
        box = self.property_box(row, i)

        try:
            element = box.find_elements(*self.OPTION_DELETE_LOCATOR)[option_index]
        except IndexError:
            raise IndexError('Invalid index of option')

        self.scroll_to_element(element)
        element.click()

    def delete_property(self, row: WebElement, i: int):
        """ Delete variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        """
        orig_property_texts = self.property_settings_texts(row, i)
        box = self.property_box(row, i)

        element = box.find_element(*self.PROPERTY_DELETE_CROSS)
        click(element)
        # wait until the box is redrawn
        self.wait_until_condition(lambda: self.property_settings_texts(row, i) != orig_property_texts)

    def inventory_tabs(self, row: WebElement) -> List[WebElement]:
        """ Return elements of inventory tabs of a row

        :param row: row element (bulk edit or listing)
        :return: array of inventory tabs elements
        """
        return row.find_elements(*self.INVENTORY_TABS_LOCATOR)

    def inventory_tab(self, row: WebElement, label: str) -> WebElement:
        """
        Return tab element with a given text
        :param row: listing row element
        :param label: label of the tab
        :return: tab WebElement
        """
        for tab in self.inventory_tabs(row):
            if tab.text == label:
                return tab
        else:
            raise Exception("Tab named '" + label + "' was not found")

    def inventory_tabs_texts(self, row: WebElement) -> List[str]:
        """ Return inventory tabs texts

        :param row: row element (bulk edit or listing)
        :return: array of inventory tabs texts
        """
        return [element.text for element in self.inventory_tabs(row)]

    def inventory_tabs_errors(self, row: WebElement) -> List[bool]:
        """ Return whether inventory tabs are marked as invalid

        :param row: row element (bulk edit or listing)
        :return: array of inventory tabs statuses - invalid data (True) / valid data (False)
        """
        return ["error" in element.get_attribute("class") for element in self.inventory_tabs(row)]

    def inventory_tab_error(self, row: WebElement, label: str) -> List[bool]:
        """ Return whether inventory tab is marked as invalid

        :param row: row element (bulk edit or listing)
        :param label: label of the tab
        :return: inventory tab is invalid (True) / valid (False)
        """
        element = self.inventory_tab(row, label)
        return "error" in element.get_attribute("class")

    def offering_options_box(self, row: WebElement, i: int=0) -> WebElement:
        """ Finds and returns a box for product offering options elements

        :param row: row element (bulk edit or listing)
        :param i: first, combined (0) or second (1) property
        :return: box element
        """
        return row.find_elements(*self.OFFERING_OPTIONS_BOX_LOCATOR)[i]

    def offering_options_errors(self, row: WebElement, i: int=0) -> List[str]:
        """ Returns error messages of product offering options rows

        :param row: row element (bulk edit or listing)
        :param i: first, combined (0) or second (1) property
        :return: list of found error messages
        """
        return self.error_baloon_texts(self.offering_options_box(row, i))

    def option_add_button(self, row: WebElement, i:int) -> WebElement:
        """ Finds and returns add button element for adding new variation property's option

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: add button element
        """
        box = self.property_box(row, i)
        return box.find_element(*self.OPTION_ADD_BUTTON_LOCATOR)

    def option_input(self, row: WebElement, i: int) -> WebElement:
        """ Finds and returns input element for adding new variation property's option

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: option input element
        """
        box = self.property_box(row, i)
        return box.find_element(*self.OPTION_INPUT_LOCATOR)

    def options_names_texts(self, row: WebElement, i: int) -> List[str]:
        """ Finds and returns names of variation property's options

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: list of variation property's options' names
        """
        box = self.property_box(row, i)
        # check element presence to speed things up
        if self.ts.is_element_present(self.OPTION_NAMES_LOCATOR):
            elements = box.find_elements(*self.OPTION_NAMES_LOCATOR)
            return [element.text for element in elements]
        else:
            return []

    def options_count(self, row: WebElement, i: int) -> int:
        """ Finds and returns count of variation property's options

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: count variation property's options
        """
        return len(self.options_names_texts(row, i))

    def property_box(self, row: WebElement, i: int) -> WebElement:
        """ Finds and returns variation property box element

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: variation property box
        """
        try:
            element = row.find_elements(*self.PROPERTY_BOXES_LOCATOR)[i]
        except IndexError:
            raise Exception('Property box element was not found')

        return element

    def property_input(self, row: WebElement, i: int) -> WebElement:
        """ Finds and returns input element for custom variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: custom property name input element
        """
        box = self.property_box(row, i)
        return box.find_element(*self.PROPERTY_INPUT)

    def property_add_button(self, row: WebElement, i: int) -> WebElement:
        """ Finds and returns add button for custom variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: custom property add button element
        """
        box = self.property_box(row, i)
        return box.find_element(*self.PROPERTY_ADD_BUTTON)

    def property_dropdown(self, row: WebElement, i: int) -> WebElement:
        """ Finds and returns dropdown for variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: property dropdown element
        """
        box = self.property_box(row, i)
        return box.find_element(*self.PROPERTY_DROPDOWN_LOCATOR)

    def property_settings_texts(self, row: WebElement, i: int) -> List[str]:
        """ Finds and returns setting af a variation property

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :return: list property settings in the same order as drop-downs
        """
        box = self.property_box(row, i)
        elements = box.find_elements(*self.PROPERTY_SETTINGS_LOCATOR)
        return [element.text for element in elements]

    def select_inventory_tab(self, row: WebElement, label: str):
        """ Go to inventory subpage (Variations, Price, Qty, SKU, Visibility) in bulk edit are or listing row

        :param row: row element (bulk edit or listing)
        :param label: label of the tab
        """
        click(self.inventory_tab(row, label))
        self.wait_until_condition(lambda: 'selected' in self.inventory_tab(row, label).get_attribute('class'))

    def set_property(self, row: WebElement, i: int, property_name: str, scale: str = None):
        """ Set variation property - its name, scale (optional)

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :param property_name: name of the variation property
        :param scale: scale for the variation property (where applicable)
        """
        box = self.property_box(row, i)
        prop = self.wait_for_child_element(box, self.PROPERTY_DROPDOWN_LOCATOR)
        self.select_from_dropdown_by_value(property_name, prop, wait_until_closed=False)

        if scale:
            box = self.property_box(row, i)
            sc = box.find_element(*self.SCALE_DROPDOWN_LOCATOR)
            self.select_from_dropdown_by_value(scale, sc, wait_until_closed=False)

    def set_custom_property(self, row: WebElement, i: int, property_name: str):
        """ Set custom variation property - its name

        :param row: row element (bulk edit or listing)
        :param i: property index: 0 - first property, 1 - second property
        :param property_name: name of the custom variation property
        """
        box = self.property_box(row, i)
        prop = self.wait_for_child_element(box, self.PROPERTY_DROPDOWN_LOCATOR)
        self.open_dropdown(prop)
        self.wait_until_condition(lambda: self.property_input(row, i).is_displayed() and
                                  self.property_input(row, i).is_enabled())
        property_input = self.property_input(row, i)
        click(property_input)
        send_keys(property_input, property_name)
        click(element_parent=box, locator=self.PROPERTY_ADD_BUTTON)

    def global_price_input(self, row: WebElement=None) -> WebElement:
        """ Finds and returns input element for global price

        :param row: listing row element - if None, bulk edit used instead
        :return: price input element
        """
        if row:
            return row.find_element(*self.GLOBAL_PRICE_INPUT)
        else:
            return self.driver.find_element(*self.BULK_EDIT_GLOBAL_PRICE_INPUT)

    def global_quantity_input(self, row: WebElement=None) -> WebElement:
        """ Finds and returns input element for global quantity

        :param row: listing row element - if None, bulk edit used instead
        :return: quantity input element
        """
        if row:
            return row.find_element(*self.GLOBAL_QUANTITY_INPUT)
        else:
            return self.driver.find_element(*self.BULK_EDIT_GLOBAL_QUANTITY_INPUT)

    def global_sku_input(self, row: WebElement=None) -> WebElement:
        """ Finds and returns input element for global sku

        :param row: listing row element - if None, bulk edit used instead
        :return: sku input element
        """
        if row:
            return row.find_element(*self.GLOBAL_SKU_INPUT)
        else:
            return self.driver.find_element(*self.BULK_EDIT_GLOBAL_SKU_INPUT)

    def bulk_edit_row_header_text(self, row: WebElement, i: int = 0) -> str:
        """ Return left or right header of the Bulk Variation edit row
        (applicable for Price, Quentity, SKU, visibility tabs)
        :param row: listing row (bulk)
        :param i: property index: 0 - first property, 1 - second property
        :return: list of header texts (['Global Pricing', 'Price', '42'])
        """
        selector = self.BULK_EDIT_HEADER_LEFT if i == 0 else self.BULK_EDIT_HEADER_RIGHT
        return row.find_element(*selector).text

    def bulk_preview_row_header(self, row: WebElement, i: int = 0) -> List[str]:
        """ Return left or right header of the Bulk Variation preview row
        (applicable for Price, Quentity, SKU, visibility tabs)
        :param row: listing row (preview)
        :param i: property index: 0 - first property, 1 - second property
        :return: list of header texts (['Global Pricing', 'Price', '42'])
        """
        selector = self.BULK_PREVIEW_ROW_LEFT_HEADER if i == 0 else self.BULK_PREVIEW_ROW_RIGHT_HEADER
        return [e.text for e in row.find_elements(*selector)]

    def bulk_header_checkbox(self, row: WebElement, i: int = 0) -> WebElement:
        """ Return bulk header checkbox, (Individual Pricing/Quantity/SKU)
        :param row: bulk row
        :param i: property index: 0 - first property, 1 - second property
        :return: element to toggle global/individual Pricing
        """

        selector = self.BULK_EDIT_HEADER_LEFT_CHECKBOX if i == 0 else self.BULK_EDIT_HEADER_RIGHT_CHECKBOX
        return row.find_element(*selector)

    def header_error_text(self, row: WebElement) -> str:
        """ Return error text in header of the row
        (applicable for Price, Quantity, SKU and Visibility tabs)

        :param row: row element (bulk edit or listing)
        :return: text of the error
        """
        element = row.find_element(*self.HEADER_ERROR)
        # when no error is present, element is hidden
        if element.is_displayed():
            return element.text
        else:
            return ''

    def bulk_individual_option_inputs(self, row: WebElement, i: int = 0) -> List[WebElement]:
        """ Return list of input boxes in bulk edit individual Price/Q/SKU
        :param row: bulk row
        :param i: property index: 0 - first property, 1 - second property
        :return: list of input elements on the left or right pane
        """
        selector = self.BULK_EDIT_OPTION_INPUTS_LEFT if i == 0 else self.BULK_EDIT_OPTION_INPUTS_RIGHT
        return row.find_elements(*selector)

    def bulk_individual_option_toggles(self, row: WebElement, i: int = 0) -> List[WebElement]:
        """ Return list of toggles in bulk edit individual Visibility
        :param row: bulk row
        :param i: property index: 0 - first property, 1 - second property
        :return: list of toggle elements on the left or right pane
        """
        selector = self.BULK_EDIT_OPTION_TOGGLES_LEFT if i == 0 else self.BULK_EDIT_OPTION_TOGGLES_RIGHT
        return row.find_elements(*selector)

    def bulk_individual_preview_options(self, row: WebElement, i: int = 0) -> List[str]:
        """ Return list of texts for preview name-value in bulk preview individual Price/Q/SKU
            (e.g. prices: ['wool', '35.50', 'cotton', '13.40'])
        :param row: preview row
        :param i: property index: 0 - first property, 1 - second property
        :return: list of input elements on the left or right pane
        """
        selector = self.BULK_PREVIEW_ROW_LEFT_OPTIONS if i == 0 else self.BULK_PREVIEW_ROW_RIGHT_OPTIONS
        return [e.text for e in row.find_elements(*selector)]

    def bulk_individual_preview_toggles(self, row: WebElement, i: int = 0) -> List[bool]:
        """ Return list of bools for preview of visibility
        - select the toggle elements and check the if the class contains 'is-true' -> selected
        :param row: preview row
        :param i: property index: 0 - first property, 1 - second property
        :return: list of input elements on the left or right pane
        """
        selector = self.BULK_PREVIEW_ROW_LEFT_TOGGLES if i == 0 else self.BULK_PREVIEW_ROW_RIGHT_TOGGLES
        return ['is-true' in e.get_attribute('class').split(' ') for e in row.find_elements(*selector)]
