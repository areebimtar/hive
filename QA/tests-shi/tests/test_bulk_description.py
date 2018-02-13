# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, BACKSPACE_KEYS, run_sql
from modules.selenium_tools import send_keys, click
from modules.testing import wait_for_assert
from modules.rabbit import setup_rabbit
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from fixtures.fixtures import test_id
from flaky import flaky


def select_listings_to_edit(driver, operation='Add Before'):
    mp = MainPage(driver)
    bp = BulkPage(driver)

    mp.select_listings_to_edit()
    click(bp.edit_part('Description'))
    bp.select_operation(operation)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkDescription(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    # --------------------------------------------------------------------------------


    ### Tests ###

    # --------------------------------------------------------------------------------
    def test_edit_single_description(self):
        """ Tests that single description can be edited, including special characters
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        mp = MainPage(d)
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves'
        click(description)
        sleep(1)

        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        send_keys(form, ' Hello<b> &amp; > 1')
        click(d.find_element_by_css_selector('bulk-edit-dashboard-op-container'))
        sleep(1)

        description_text = row.find_element_by_css_selector('div.body span.description').text
        assert description_text == 'invisible gloves Hello<b> &amp; > 1'

    # --------------------------------------------------------------------------------
    def test_single_description_required(self):
        """ Tests that single description cannot be changed to empty
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        click(description)
        sleep(1)

        # delete description and check error message
        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        send_keys(form, BACKSPACE_KEYS * 4)
        sleep(1)

        error_text = bp.error_baloon_texts(row)
        assert error_text == ['Description is required']

        # click away and check that description was not changed
        click(d.find_element_by_css_selector('bulk-edit-dashboard-op-container'))
        description_text = row.find_element_by_css_selector('div.body span.description').text
        assert description_text == 'invisible gloves'

    def test_description_add_before(self):
        """ Tests that correct text can be added before
        """
        expected_descriptions = [
            'hello invisible gloves',
            'hello invisible gloves',
            'hello invisible gloves',
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input_description()
        send_keys(input_field, 'hello ')
        click(bp.operation_apply())

        descriptions = bp.listing_descriptions()
        assert descriptions == expected_descriptions

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')



    # --------------------------------------------------------------------------------
    def test_description_add_after(self):
        """ Tests that correct text can be added after
        """
        expected_descriptions = [
            'invisible gloves hello', 
            'invisible gloves hello',
            'invisible gloves hello',
        ]

        select_listings_to_edit(self.driver, 'Add After')
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input_description()
        send_keys(input_field, ' hello')
        click(bp.operation_apply())

        descriptions = bp.listing_descriptions()
        assert descriptions == expected_descriptions

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')


    # --------------------------------------------------------------------------------
    def test_description_find_replace(self):
        """ Tests that find and replace works
        special case '$'
        """
        expected_descriptions_1 = [
            'invisible shoes $10', 
            'invisible shoes $10',
            'invisible shoes $10',
        ]
        expected_descriptions_2 = [
            'invisible shoes 10 Kč (not $)', 
            'invisible shoes 10 Kč (not $)',
            'invisible shoes 10 Kč (not $)',
        ]

        operation = 'Find & Replace'

        select_listings_to_edit(self.driver, operation)
        d = self.driver
        bp = BulkPage(d)

        input_find_field = bp.operation_input_find_description()
        input_replace_field = bp.operation_input_replace_description()

        send_keys(input_find_field, 'gloves')
        send_keys(input_replace_field, 'shoes $10')
        click(bp.operation_apply())

        descriptions = bp.listing_descriptions()
        assert descriptions == expected_descriptions_1

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

            # check '$' can be replaced
        bp.select_operation(operation)
        input_find_field = bp.operation_input_find_description()
        input_replace_field = bp.operation_input_replace_description()

        send_keys(input_find_field, '$10')
        send_keys(input_replace_field, '10 Kč (not $)')
        click(bp.operation_apply())

        descriptions = bp.listing_descriptions()
        assert descriptions == expected_descriptions_2

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')


    # --------------------------------------------------------------------------------
    def test_description_delete(self):
        """ Tests that delete works
        """
        expected_descriptions = [
            'visible gloves', 
            'visible gloves',
            'visible gloves',
        ]

        select_listings_to_edit(self.driver, 'Delete')
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input_description()
        send_keys(input_field, 'in')
        click(bp.operation_apply())

        descriptions = bp.listing_descriptions()
        assert descriptions == expected_descriptions

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_description_discard(self):
        """ Tests that the single description changes are not discarded when a user starts editing a new one
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves'
        click(description)
        sleep(1)

        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        send_keys(form, ' Test')

        # click on the second description
        row2 = bp.listing_row('Second something 1235 (2)')
        description2 = row2.find_element_by_css_selector('div.body span.description')
        click(description2)

        # check the 1st description is saved
        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves Test'

    # --------------------------------------------------------------------------------
    def test_description_mixed_content(self):
        """ Tests that switching between descriptions does not cause listing-1 to contain description of listing-2
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves'
        click(description)
        sleep(1)

        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        send_keys(form, ' Test')

        # save it
        click(d.find_element_by_css_selector('bulk-edit-dashboard-op-container'))
        sleep(1)

        # check the 1st description is saved
        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves Test'

        # click on the second description
        row2 = bp.listing_row('Second something 1235 (2)')
        description2 = row2.find_element_by_css_selector('div.body span.description')
        click(description2)
        form = row2.find_element_by_css_selector('div.body form > textarea')
        click(form)

        # click on the 1st description
        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')
        assert description.text == 'invisible gloves Test'
        click(description)
        sleep(1)
        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        sleep(1)
        assert form.text == 'invisible gloves Test'

@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkDescriptionSync(BaseTestClass):
    def setup_class(self):
        super().setup_class(self)
        self.set_etsy_testcase(self, 'tc1')

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        setup_rabbit()
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    # --------------------------------------------------------------------------------
    def test_sync_description(self):
        """ Tests that data is written to the database when [Sync Updates] is clicked
        """
        expected_data = [['1', 'invisible gloves New Description']]

        d = self.driver
        select_listings_to_edit(d)

        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        description = row.find_element_by_css_selector('div.body span.description')

        click(description)
        sleep(1)

        form = row.find_element_by_css_selector('div.body form > textarea')
        click(form)
        send_keys(form, ' New Description')
        click(d.find_element_by_css_selector('bulk-edit-dashboard-op-container'))
        sleep(1)

        click(bp.sync_updates_button())

        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_description_modified', True),
                        'Unexpected data in DB')
