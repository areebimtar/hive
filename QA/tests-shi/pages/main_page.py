# Main Hive page
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from time import sleep
from shishito.ui.selenium_support import click_delay
from pages.base_page import BasePage
from modules.selenium_tools import send_keys, click


class MainPage(BasePage):
    MAIN_PAGE_NUMS = 'app-dashboard--pagination > div  > span > span'
    MAIN_PAGE_INDEXES = [0, 1, 2]
    APP_HEADER_LOCATOR = (By.CSS_SELECTOR, 'div.app-header')
    INVALID_SHOP_TEXT_LOCATOR = (By.CSS_SELECTOR, 'div.invalid-shop')
    SHOP_NAME_LOCATOR = (By.CSS_SELECTOR, 'app-sidebar span.menu-shop')
    CHOOSE_SHOP_BUTTON = (By.CSS_SELECTOR, 'app-sidebar button')
    SHOPS_MENU_LOCATOR = (By.CSS_SELECTOR, 'app-sidebar div.shops-menu')
    SHOP_MENU_ITEM_XPATH = '//app-sidebar//span[text()="{shop_name}"]'

    def __init__(self, driver):
        self.driver = driver

    def is_displayed(self):
        # check that app header is present (it's shown in both cases when user has/doesn't have a shop
        try:
            self.driver.find_element(*self.APP_HEADER_LOCATOR)
        except NoSuchElementException:
            return False
        else:
            return True

    def choose_shop_button(self):
        return self.driver.find_element(*self.CHOOSE_SHOP_BUTTON)

    def change_shop(self, shop_name):
        click(self.choose_shop_button())
        self.wait_for_child_element(self.driver, self.SHOPS_MENU_LOCATOR)
        try:
            shop_menu_item = self.driver.find_element_by_xpath(self.SHOP_MENU_ITEM_XPATH.format(shop_name=shop_name))
        except NoSuchElementException:
            raise ValueError('Shop "%s" not found in the menu' % shop_name)
        click(shop_menu_item)

    def channel_button(self):
        return self.driver.find_element(By.XPATH, "//app-sidebar--menu/div/button")
    #
    def channel_item(self, text):
        return self.driver.find_element(By.XPATH, "//app-sidebar--menu/div/ul/li/a[contains(text(),'" + text +"')]")
    #
    def filters(self):
        return self.driver.find_elements_by_css_selector('app-sidebar--filter h6')
    #
    def filter_tabs(self):
        return self.driver.find_elements_by_css_selector('app-sidebar--filter div.main-filter-group ul li a')
    #
    def filter_tabs_counts(self):
        return self.driver.find_elements_by_css_selector('app-sidebar--filter-container div.main-filter-group ul li span')
    #
    def filter_tab(self, name):
        for t in self.filter_tabs():
            tab_name = t.text
            if tab_name == name:
                return t
        return None
    #
    def is_filter_tab_active(self, name):
        return 'active' in self.filter_tab(name).find_element_by_xpath('./..').get_attribute('class')
    #
    def filter_group_divs(self):
        return self.driver.find_elements_by_css_selector('app-sidebar--filter-container > div.filter-group-wrapper div.filter-group-content div.filter-group')
    #
    def filter_checkbox(self, section_name, item_name):
        section_divs = self.filter_group_divs()
        for div in section_divs:
            current_section_name = div.find_element_by_css_selector('h6').text
            if current_section_name == section_name:
                section_items = div.find_elements_by_css_selector('ul > li')
                for item in section_items:
                    item_div = item.find_element_by_css_selector('div')
                    if item_div.text == item_name:
                        return item_div
    #
    def filter_search(self):
        return self.driver.find_element_by_css_selector('app-dashboard--actions div.filter-search input')
    #
    def listing_rows(self):
        rows = self.driver.find_elements_by_css_selector('app-dashboard--table div.table-body div.table-row')
        return rows[1:-1]   # 1st and last rows are paging -> discard them

    def listing_title(self, row):
        return row.find_element_by_css_selector('div.title').text

    def row_price(self, row):
        return row.find_element_by_css_selector('div.price').text
 
    @click_delay
    def listing_select_all_checkbox(self):
        return self.driver.find_element_by_css_selector('app-dashboard--table div.table-header div.table-checkbox div.checkbox')
    #
    def listing_titles_sorted(self):
        titles = [ t.text for t in self.driver.find_elements_by_css_selector('app-dashboard--table div.table-body div.table-row div.table-row-column div.title') ]
        return sorted(titles)
    #
    def prev_page_button(self):
        rows = self.driver.find_elements_by_css_selector('app-dashboard--table div.table-body div.table-row')
        return rows[0]   # 1st and last rows are paging
    #
    def next_page_button(self):
        rows = self.driver.find_elements_by_css_selector('app-dashboard--table div.table-body div.table-row')
        return rows[-1]   # 1st and last rows are paging
    #
    def page_numbers(self):
        return self.driver.find_element_by_css_selector('app-dashboard--pagination > div:nth-child(1) > span:nth-child(1)').text
    #
    def edit_listings_button(self):
        return self.driver.find_element_by_css_selector('app-dashboard--actions > ul > li:nth-child(1)')
    #
    def hive_demo_link(self):
        for a in self.driver.find_elements_by_css_selector('a'):
            if a.text == 'Etsy/HiveDemo':
                return a
    #
    def get_main(self, base_url):
        self.driver.get(base_url)
        sleep(1)
        #self.hive_demo_link().click()
        #sleep(2)


    # --------------------------------------------------------------------------------
    DEFAULT_LISTINGS_TO_SELECT = [
        'First something 1234 (1)',
        'Second something 1235 (2)',
        'Third something LG-512a (3)',
    ]

    def select_filter_tab(self, status):
        # first wait for state filters to appear if needed
        self.wait_for_state_filters()

        click(self.filter_tab(status))
        # after choosing a state filter, wait to switch to it
        for _ in range(0, 5):
            if self.is_filter_tab_active(status):
                break
            sleep(1)
        else:
            assert self.is_filter_tab_active(status), 'State filter "' + status + '" is not chosen.'

    def wait_for_state_filters(self):
        BasePage.wait_until_condition(lambda: len(self.filter_tabs()) > 0, 'State filters are not visible')

    def wait_for_listings(self):
        """ Wait for listings to appear in the main page
        """
        BasePage.wait_until_condition(lambda: len(self.listing_titles_sorted()) > 0, 'No listings are shown')

    def select_listings_to_edit(self, checked_listings=DEFAULT_LISTINGS_TO_SELECT, status=None, filter=None):
        """
        select listings and start bulk edit
        :param checked_listings:
            - 'ALL'   -> select all
            - ['title 1', 'title2' ... ] -> select these titles
        """
        d = self.driver
        pg = MainPage(d)

        if status is not None:
            self.select_filter_tab(status)

        # wait for listings to appear
        self.wait_for_listings()

        if filter:
            send_keys(self.filter_search(), filter)
            sleep(2)  # no simple way how to ensure that filter was applied

        if checked_listings == 'ALL':
            click(self.listing_select_all_checkbox())
        else:
                # check checkboxes [checked_listings]
            listings_selected = 0
            while True:
                listing_rows = pg.listing_rows()
                listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings]

                for listing_row in listings_to_select:
                    div = listing_row.find_element_by_css_selector('div.table-row-column div.title')
                    d.execute_script("arguments[0].scrollIntoView(true);", div)
                    click(div)
                    listings_selected += 1
                if listings_selected >= len(checked_listings):
                    break

                pages = self.page_nums(self.MAIN_PAGE_NUMS, self.MAIN_PAGE_INDEXES)
                if pages[1] < pages[2]:
                    next_page_button = pg.next_page_button()
                    click(next_page_button)
                    sleep(2)
                else:
                    raise Exception("Error: select_listings_to_edit: could not find listing to click on")


            # click the Edit Listings
        edit_listings_button = pg.edit_listings_button()
        d.execute_script("arguments[0].scrollIntoView(true);", edit_listings_button);
        click(edit_listings_button)
        sleep(1)

    def invalid_shop_text(self):
        return self.driver.find_element(*self.INVALID_SHOP_TEXT_LOCATOR).text

    def listing_texts(self, title):
        rows = self.listing_rows()
        for row in rows:
            if self.listing_title(row) == title:
                return row.text.split('\n')
        else:
            raise ValueError('Listing title "%s" not found' % title)

    def shop_name_text(self):
        return self.driver.find_element(*self.SHOP_NAME_LOCATOR).text
