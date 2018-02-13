#  Hive bulk edit page
import re
from time import sleep
from shishito.ui.selenium_support import click_delay
from pages.base_page import BasePage
from pages.main_page import MainPage
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from modules.selenium_tools import click, send_keys, wait_for_web_assert


class MaxSectionsReachedError(Exception):
    pass

class BulkPage(BasePage):
    DEFAULT_ROW_SELECTOR = 'div.table-row-column div.body div.title'
    TITLE_ROW_SELECTOR = 'div.table-row-column div.body span.title'
    TITLE_ELEMENT_REL_LOCATOR = (By.CSS_SELECTOR, 'span.title')
    TITLE_INPUT_REL_LOCATOR = (By.CSS_SELECTOR, 'input')
    ERROR_BUBBLE_REL_LOCATOR = (By.CSS_SELECTOR, 'div.error')
    OPERATION_DROPDOWN = By.CSS_SELECTOR, 'bulk-edit-dashboard--table div.bulk-edit--actions div.bulk-edit--actionselector'
    BULK_SECTION_DROPDOWN = By.CSS_SELECTOR, 'bulk-edit-dashboard--table div.bulk-edit--actions div.bulk-edit--actionselector'
    ROW_SECTION_DROPDOWN = By.CSS_SELECTOR, 'div.bulk-edit-dropdown-item'
    BULK_PAGE_NUMS = 'div.table-row.table-pagination.next-button.show span'
    BULK_PAGE_INDEXES = [0, 1, 2]

    def bulk_edit_close_button(self):
        return self.driver.find_element_by_css_selector('button.bulk-edit-close-button')

    def close_bulk_edit(self):
        click(self.bulk_edit_close_button())
        mp = MainPage(self.driver)
        # wait for main page to load (at least state filters)
        mp.wait_for_state_filters()

    def operation_select(self):
        return self.driver.find_element(*self.OPERATION_DROPDOWN)

    def operation_menu_items(self):
        for _ in range(5):
            items = self.driver.find_elements_by_css_selector('bulk-edit-dashboard--table div.bulk-edit--actions div.rw-dropdownlist ul li')
            if len(items) > 0:
                return items
            print("Error: operation_menu_items: no items returned")
            sleep(0.5)

    def operation_menu_new_item_input(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--table div.bulk-edit--actions div.rw-dropdownlist form input')

    @click_delay
    def operation_menu_item(self, name):
        menu_items = self.operation_menu_items()
        for i in menu_items:
            if i.text == name:
                return i
        else:
            print("ERROR operation_menu_item: menu_items =", menu_items, ", name =", name)

    def operation_input(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form input[name="value"]')

    def operation_input_description(self):
        """
        Description input for Etsy
        """
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form textarea')

    def operation_edit_area_description(self):
        """
        Description edit area for Shopify
        """
        return self.driver.find_element_by_css_selector(
            'bulk-edit-dashboard--content div.bulk-edit--controls form div.fr-view')

    def operation_input_dolars(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form input[name="value"]')

    @click_delay
    def operation_switch_dolars(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form div.button-switch div.left')

    @click_delay
    def operation_switch_percent(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form div.button-switch div.right')

    def operation_input_cents(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form div.price-round input')

    def operation_input_cents_changeto(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--controls form input.price-round')

    def operation_input_find(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content   div.bulk-edit--actionform input[name="find"]')

    def operation_input_find_description(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--table form > textarea[name="find"]')

    def operation_input_replace(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--content   div.bulk-edit--actionform input[name="replace"]')

    def operation_input_replace_description(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard--table form > textarea[name="replace"]')

    @click_delay
    def operation_apply(self):
        return self.driver.find_element_by_xpath("//bulk-edit-dashboard--table//button[contains(text(),'Apply')]")

    def listing_rows(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content > div.table div.table-body div.table-row  ')[1:-1]

    def listing_rows_texts_sorted(self):
        titles = [t.text for t in self.listing_rows()]
        return sorted(titles)

    def listing_titles(self):
        elements = self.driver.find_elements_by_css_selector(
            'bulk-edit-dashboard--content > div.table div.table-row div.body > .title')

        return [t.text for t in elements]

    def error_baloon(self):
        try:
            e = self.driver.find_element_by_css_selector('bulk-edit-dashboard--content div.error')
            return e.text
        except:
            return ''

    def error_baloon_pictures(self):
        try:
            el = self.driver.find_elements(By.CSS_SELECTOR, 'div.image div.photo-thumbnail-transient-error')
            return [e.text for e in el if e.get_attribute("class") != 'error-bubble-right photo-thumbnail-transient-error no-error']
        except:
            return ''

    def prev_page_button(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content > div.table div.table-body div.table-row  ')[0]

    def next_page_button(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content > div.table div.table-body div.table-row  ')[-1]

    def sync_updates_button(self):
        return self.driver.find_element_by_css_selector('bulk-edit-dashboard-op-container button.bulk-edit-sync-button')

    def sync_popup(self):
        return self.driver.find_element_by_css_selector('div.sync-info-popup')

    def sync_popup_got_it_button(self):
        return self.sync_popup().find_element_by_css_selector('button')

    def sync_changes(self, timeout_sec=5):
        click(self.sync_updates_button())
        wait_for_web_assert(False,
                            lambda: self.sync_updates_button().is_enabled(),
                            'Sync button is not disabled after sync',
                            delay_sec=1,
                            retries=timeout_sec)

    def sidebar_tab(self, part):
        """ Return tab element for the bulk subpage

        :param part: name of the subpage, i.e. Description
        :return: The element of the specified subpage tab """
        return self.driver.find_element_by_xpath(
            "//div[@class='bulk-edit-sidebar']/ul/li[contains(text(),'" + part + "')]")

    @click_delay
    def edit_part(self, part):
        return self.sidebar_tab(part)

    def end_inline_edit(self):
        """ Ends inline edit by clicking on VELA logo
        """
        click(self.driver.find_element_by_css_selector('div.app-header-logo'))

    def is_part_modified(self, part):
        """ Check whether update indication is shown for the bulk subpage

        :param part: name of the subpage in bulk page
        :return: True if blue dot is shown, False otherwise
        """
        part_class = self.sidebar_tab(part).find_element_by_css_selector('span').get_attribute("class")
        return "updates" in part_class

    def tag_elements(self, row):
        return row.find_elements_by_css_selector('div.body div.bulk-tags div.bulk-tags--item span.tag')

    def tag_names(self, row_element=None):
        if row_element is None:
            result = []
            for row in self.listing_rows():
                row_tags = [t.text for t in self.tag_elements(row=row)]
                result.append(row_tags)
            return sorted(result)
        else:
            return [t.text for t in self.tag_elements(row=row_element)]

    def material_elements(self, row):
        return row.find_elements_by_css_selector('div.body span.bulk-tags div.bulk-tags--item span.material')

    def material_names(self, row_element=None):
        if row_element is None:
            result = []
            for row in self.listing_rows():
                row_materials = [t.text for t in self.material_elements(row=row)]
                result.append(row_materials)
            return sorted(result)
        else:
            return [t.text for t in self.material_elements(row=row_element)]

    def category_elements(self, row):
        return row.find_elements_by_css_selector('div.bulk-edit--properties span.taxonomy span.taxonomy-tag')

    def category_names(self, row_element=None):
        if row_element is None:
            result = []
            for row in self.listing_rows():
                row_categories = [t.text for t in self.category_elements(row=row)]
                result.append(row_categories)
            return sorted(result)
        else:
            return [t.text for t in self.category_elements(row=row_element)]

    def section_names(self, row_title=None):
        if row_title:
            row = self.listing_row(row_title)
            return [self.section_dropdown(row).text]
        else:
            return [self.section_dropdown(row).text for row in self.listing_rows()]

    def holiday_dropdown(self, row_number=0, row=None):
        if row is None:
            row = self.listing_rows()[row_number]
        return row.find_element_by_css_selector("div.body span.bulk-edit-dropdown-item")

    def occasion_dropdown(self, row_number=0, row=None):
        if row is None:
            row = self.listing_rows()[row_number]
        return row.find_element_by_css_selector("div.body span.bulk-edit-dropdown-item")

    def section_dropdown(self, row=None):
        if row:
            return row.find_element(*self.ROW_SECTION_DROPDOWN)
        else:
            return self.driver.find_element(*self.BULK_SECTION_DROPDOWN)

    def listing_descriptions(self):
        result = []
        rows = self.listing_rows()
        for row in rows:
            description = row.find_element_by_css_selector('div.body span.description')
            result.append(description.text)
        return result

    # --------------------------------------------------------------------------------
    def select_category(self, actions, parent_element=None, individual_dropdown=False):
        """ In the bulk edit area it selects category for selected products.

        :param actions: array of strings ie ['Accessories', 'Baby Accessories', 'Baby Carriers & Wraps']
        """
        d = self.driver
        wait_until_closed = not individual_dropdown

        for num, action in enumerate(actions):
            if parent_element:
                action_selectors = parent_element.find_elements_by_css_selector(
                    'span.bulk-edit-dropdown-parent')
            else:
                action_selectors = d.find_elements_by_css_selector(
                    'bulk-edit-dashboard--table div.bulk-edit--controls div.bulk-edit--actionselector')
            my_selector = action_selectors[num]
            self.select_from_dropdown_by_value(action, my_selector, individual_dropdown, wait_until_closed)

    def select_single_holiday(self, row_title, holiday):
        row = self.listing_row(row_title)
        hol_dropdown = self.holiday_dropdown(row=row)
        self.select_from_dropdown_by_value(holiday, hol_dropdown, individual_dropdown=True)

    def select_single_occasion(self, row_title, occasion):
        row = self.listing_row(row_title)
        oc_dropdown = self.occasion_dropdown(row=row)
        self.select_from_dropdown_by_value(occasion, oc_dropdown, individual_dropdown=True)

    def add_new_section(self, section_name):
        section_dropdown = self.section_dropdown()
        self.open_dropdown(section_dropdown, individual_dropdown=False)
        sleep(1)
        try:
            self.operation_menu_new_item_input().clear()
        except NoSuchElementException:
            raise MaxSectionsReachedError('Input element was not found')
        send_keys(self.operation_menu_new_item_input(), section_name + Keys.RETURN)

    def select_single_section(self, row_title, section_name):
        row = self.listing_row(row_title)
        section_dropdown = self.section_dropdown(row)
        self.select_from_dropdown_by_value(section_name, section_dropdown, individual_dropdown=True)

    def select_holiday(self, holiday):
        sleep(1)
        operation_dropdown = self.operation_select()
        self.select_from_dropdown_by_value(holiday, operation_dropdown, individual_dropdown=True)

    def select_occasion(self, occasion):
        sleep(1)
        operation_dropdown = self.operation_select()
        self.select_from_dropdown_by_value(occasion, operation_dropdown, individual_dropdown=True)

    def select_section(self, section_name):
        section_dropdown = self.section_dropdown()
        self.select_from_dropdown_by_value(section_name, section_dropdown)

    # --------------------------------------------------------------------------------
    def select_operation(self, operation='Add Before'):
        sleep(1)
        operation_dropdown = self.operation_select()
        self.select_from_dropdown_by_value(operation, operation_dropdown)

    def set_operation_input(self, value):
        input_field = self.operation_input()
        send_keys(input_field, value)

    def set_single_title(self, row_title, new_title):
        row = self.listing_row(row_title, self.TITLE_ROW_SELECTOR)
        title_element = row.find_element(*self.TITLE_ELEMENT_REL_LOCATOR)
        click(title_element)
        input_element = self.wait_for_child_element(row, self.TITLE_INPUT_REL_LOCATOR)
        input_element.clear()
        send_keys(input_element, new_title + Keys.ENTER)
        self.wait_for_child_element(row, self.TITLE_ELEMENT_REL_LOCATOR)

    # --------------------------------------------------------------------------------
    def click_on_listings(self, listings, selector=DEFAULT_ROW_SELECTOR):
        d = self.driver

            # check checkboxes
        listings_selected = 0
        while True:
            listing_rows = self.listing_rows()
            listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector(selector).text in listings]
            for listing_row in listings_to_select:
                span = listing_row.find_element_by_css_selector(selector)
                d.execute_script("arguments[0].scrollIntoView(true);", span);
                click(span)
                sleep(1)
                listings_selected += 1
            if listings_selected >= len(listings):
                break
            pages = self.page_nums(self.BULK_PAGE_NUMS, self.BULK_PAGE_INDEXES)
            if pages[1] <= pages[2]:
                next_page_button = self.next_page_button()
                click(next_page_button)
                sleep(2)
            else:
                raise Exception("Error: click_on_listings: could not find listing to click on")


    # --------------------------------------------------------------------------------
    def listing_row(self, title, selector=DEFAULT_ROW_SELECTOR):
        d = self.driver

        while True:
            listing_rows = self.listing_rows()
            for r in listing_rows:
                if r.find_element_by_css_selector(selector).text == title:
                    return r

            pages = self.page_nums(self.BULK_PAGE_NUMS, self.BULK_PAGE_INDEXES)
            if pages[1] <= pages[2]:
                next_page_button = self.next_page_button()
                click(next_page_button)
                sleep(2)
            else:
                raise Exception("Error: listing_row: could not find listing '" + title + "'")

    def listing_checked_bool(self, row):
        """ Returns the information whether listing is checked or not

        :param row: element of the row of the listing
        :return: bool - listing is checked or not
        """
        element = row.find_element_by_css_selector('div.table-checkbox > div.checkbox')
        return 'checked' in element.get_attribute('class')

    def error_baloon_texts(self, parent=None):
        """ Finds and returns texts of all error bubbles in variation property box

        :param parent: parent element, if not provided whole page is searched
        :return: error bubbles' texts as list of strings
        """
        try:
            if parent:
                error_locators = parent.find_elements(*self.ERROR_BUBBLE_REL_LOCATOR)
            else:
                error_locators = self.driver.find_elements(*self.ERROR_BUBBLE_REL_LOCATOR)
            return [e.text for e in error_locators]
        except NoSuchElementException:
            return []

    def bulk_photo_elements(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--actions-photos div.bulk-edit--actionform div.photo')

    def row_photo_elements(self, row):
        return row.find_elements_by_css_selector('div.photo')

    def select_image(self, photo_elem, img_path):

        def get_display_style(element):
            style = element.get_attribute('style')
            m = re.match('display: ([a-z]*)', style)
            if m is not None:
                return m.group(1)
            return ''

        def set_display_style(element, style):
            self.driver.execute_script("arguments[0].style.display = '" + style + "'", element)

        file_input = photo_elem.find_element_by_xpath(".//input[@type='file']")
        orig_style = get_display_style(file_input)
        set_display_style(file_input, 'inline')
        self.driver.execute_script("arguments[0].value = ''", file_input)
        file_input.send_keys(img_path)
        set_display_style(file_input, orig_style)

    def select_photo(self, index, img_path):
        photos = self.bulk_photo_elements()
        self.select_image(photos[index], img_path)

    def select_single_photo(self, listing_name, index, img_path):
        row = self.listing_row(listing_name)
        photos = self.row_photo_elements(row)
        self.select_image(photos[index], img_path)
