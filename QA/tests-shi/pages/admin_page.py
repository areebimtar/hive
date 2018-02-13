from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.by import By
from tests.base import click
from modules.selenium_tools import send_keys, click
from typing import List


class AdminPage(object):

    ETSY_SHOPS_COUNT = By.CSS_SELECTOR, 'div.row > div.col .count'
    SEARCH_FIELD = By.ID, 'search'
    SEARCH_RESULTS_TABLE = By.CSS_SELECTOR, 'table'
    SEARCH_DETAILS_LINK = By.XPATH, '//i[text()="navigate_next"]'
    SHOP_DETAILS_LISTINGS_SUMMARY = By.XPATH, '//span[text()="Listings summary"]/..'
    SHOP_OWNERS_TABLE = By.XPATH, '//span[text()="Owners"]/following-sibling::table'
    SHOP_NAME = By.CSS_SELECTOR, 'span.shop-detail-name'
    SHOP_ID = By.ID, 'shop-detail-id'
    SHOP_CHANNEL_ID = By.ID, 'shop-detail-channel_shop_id'
    SHOP_SYNC_STATUS = By.ID, 'shop-detail-sync_status'
    SHOP_LAST_SYNC = By.ID, 'shop-detail-last_sync_timestamp'
    SHOP_INVALID = By.ID, 'shop-detail-invalid'
    SHOP_ERROR = By.ID, 'shop-detail-error'

    def __init__(self, driver, ts):
        self.driver = driver
        self.ts = ts

    @property
    def _search_results_table(self) -> WebElement:
        """ Find search results table

        :return: table element
        """
        return self.driver.find_element(*self.SEARCH_RESULTS_TABLE)

    @property
    def _shop_owners_table(self) -> WebElement:
        """ Find shop owners table in shop details

        :return: table element
        """
        return self.driver.find_element(*self.SHOP_OWNERS_TABLE)

    @staticmethod
    def _table_rows(table_element: WebElement, header=True) -> List[WebElement]:
        """ Return table rows

        :param table_element: table element
        :param header: skips the header when true if table has a header
        :return: table rows elements
        """
        first_row = 1 if header else 0
        return table_element.find_elements_by_css_selector('tr')[first_row:]

    @staticmethod
    def _table_columns_texts(row: WebElement) -> List[str]:
        """ Return table columns' texts

        :param row: table row element
        :return: columns' texts
        """
        columns = row.find_elements_by_css_selector('td')
        return [column.text for column in columns]

    def _table_contents(self, table_element: WebElement, header=True) -> List[List[str]]:
        """ Return table contents as data

        :param table_element: table element
        :param header: skips the header when true if table has a header
        :return: table data
        """
        results = []
        for row in self._table_rows(table_element, header):
            results.append(self._table_columns_texts(row))
        return results

    def _search_results_shop_row(self, shop_name: str) -> WebElement:
        """ Return row from search shop results of a particular shop

        :param shop_name: name of the shop
        :return: table row
        """
        for row in self._table_rows(self._search_results_table):
            print(self._table_columns_texts(row))
            if self._table_columns_texts(row)[2] == shop_name:
                return row
        else:
            raise ValueError('Shop name "%s" not found in table')

    def open(self, base_page: str):
        """ Opens Admin page

        :param base_page: base page of web app (user logged in)
        """
        self.driver.get(base_page + 'admin')

    def go_to_subpage(self, sub_page: str):
        """ Open Admin sub-page, i.e. Shops or Users

        :param sub_page: name of sub page to open
        """
        sub_page_link = self.driver.find_element_by_xpath('//ul[@id="nav-mobile"]//a[text()="%s"]' % sub_page)
        click(sub_page_link)

    def search(self, text: str):
        """ Search records using search input

        :param text: text to search
        """
        field = self.driver.find_element(*self.SEARCH_FIELD)
        send_keys(field, text)

    def get_search_results(self) -> List[List[str]]:
        """ Return search results table data

        :return: table data
        """
        self.ts.wait_for_element_visible(self.SEARCH_RESULTS_TABLE)
        return self._table_contents(self._search_results_table)

    def go_to_search_shop_details(self, shop_name: str):
        """ Go to details of a shop in search results

        :param shop_name: name of the shop to display its details
        """
        row = self._search_results_shop_row(shop_name)
        link_next = row.find_element(*self.SEARCH_DETAILS_LINK)
        click(link_next)
        self.ts.wait_for_element_visible(self.SHOP_DETAILS_LISTINGS_SUMMARY)

    def etsy_shop_count(self) -> str:
        """ Returns number of unique etsy shops as reported by Admin page

        :return: number of shops
        """
        return self.driver.find_element(*self.ETSY_SHOPS_COUNT).text

    # --- shop subpage, shop detail values ---

    def get_shop_name(self) -> str:
        return self.driver.find_element(*self.SHOP_NAME).text

    def get_shop_id(self) -> str:
        return self.driver.find_element(*self.SHOP_ID).text

    def get_shop_channel_id(self) -> str:
        return self.driver.find_element(*self.SHOP_CHANNEL_ID).text

    def get_shop_sync_status(self) -> str:
        return self.driver.find_element(*self.SHOP_SYNC_STATUS).text

    def get_shop_last_sync(self) -> str:
        return self.driver.find_element(*self.SHOP_LAST_SYNC).text

    def get_shop_invalid(self) -> str:
        return self.driver.find_element(*self.SHOP_INVALID).text

    def get_shop_error(self) -> str:
        return self.driver.find_element(*self.SHOP_ERROR).text

    def get_shop_owners(self):
        return self._table_contents(self._shop_owners_table)

    def get_shop_number_of_listings(self, listing_type: str) -> str:
        return self.driver.find_element_by_id('shop-detail-count-' + listing_type.lower()).text
