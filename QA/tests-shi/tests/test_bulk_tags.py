# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import send_keys, click
from modules.testing import wait_for_assert
from modules.rabbit import setup_rabbit
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from fixtures.fixtures import test_id
from flaky import flaky


def select_listings_to_edit(driver, operation='Add'):
    mp = MainPage(driver)
    bp = BulkPage(driver)

    mp.select_listings_to_edit()
    click(bp.edit_part('Tags'))
    bp.select_operation(operation)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkTags(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
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

    # --- Tests ---

    def test_create_tag_normal(self):
        """ Tests that a tag can be created in bulk edit
        """
        expected_tags = [
            ['Tag01', 'AAA'],
            ['Tag01', 'AAA'],
            ['Tag01', 'AAA'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags

    # --------------------------------------------------------------------------------
    def test_create_tag_too_long(self):
        """ Tests that a tag cannot be longer than 20 characters
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAAAABBBBBCCCCCDDDDDE')
        err = bp.error_baloon()
        assert err == "Maximum length of tag is 20"

    # --------------------------------------------------------------------------------
    def test_create_tag_special_chars(self):
        """ Tests that a tag can be created in bulk edit with czech chars, but not special chars
        """
        expected_tags = [
            ['Tag01', 'žvýkačky'],
            ['Tag01', 'žvýkačky'],
            ['Tag01', 'žvýkačky'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'žvýkačky')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags

        send_keys(bp.operation_input(), 'me@site')
        err = bp.error_baloon()
        assert err == "Tag can only include spaces, letters, hyphens, and numbers"

    # --------------------------------------------------------------------------------
    def test_create_tag_multi(self):
        """ Tests that multiple tags can be created in bulk edit
        """
        expected_tags = [
            ['Tag01', 'AAA', 'BBB', 'CCC'],
            ['Tag01', 'AAA', 'BBB', 'CCC'],
            ['Tag01', 'AAA', 'BBB', 'CCC'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags

    # --------------------------------------------------------------------------------
    def test_create_tag_multi_over(self):
        """ Tests that multiple tags can be created in bulk edit, but no more than 13
        """
        expected_tags_01 = [
            ['Tag01'],
            ['Tag01'],
            ['Tag01', 'AAA', 'BBB', 'CCC'],
        ]

        expected_tags_02 = [
            ['Tag01', '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
            ['Tag01', '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
            ['Tag01', 'AAA', 'BBB', 'CCC', '00', '01', '02', '03', '04', '05', '06', '07', '08'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        # deselect 2, 3
        bp.click_on_listings(['Second something 1235 (2)', 'Third something LG-512a (3)'])

        # append AAA BBB CCC tags to the 1st listing
        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags_01

        # select 2, 3 again
        bp.click_on_listings(['Second something 1235 (2)', 'Third something LG-512a (3)'])
        send_keys(bp.operation_input(), '00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags_02

    # --------------------------------------------------------------------------------
    def test_delete_single_tag(self):
        """ Tests that single tag can be deleted
        """

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        tag_names = bp.tag_names(row)
        assert tag_names == ['Tag01']

        tags = bp.tag_elements(row)
        close_icon = tags[0].find_element_by_css_selector('span.close')
        click(close_icon)
        sleep(2)

        tag_names = bp.tag_names(row)
        assert tag_names == []

        titles = bp.listing_rows_texts_sorted()
        assert titles[0] == "First something 1234 (1)\n13 remaining"

    # --------------------------------------------------------------------------------
    def test_delete_tag(self):
        """ Tests that tags can be deleted in bulk
        """

        expected_tags = [
            [],
            [],
            [],
        ]

        select_listings_to_edit(self.driver, 'Delete')
        d = self.driver
        bp = BulkPage(d)

        tag_field = bp.operation_input()
        click(tag_field)
        send_keys(tag_field, 'Tag')
        send_keys(tag_field, '01')
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        tag_names = bp.tag_names()
        assert tag_names == expected_tags


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkTagsSync(BaseTestClass):
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

    def test_sync_updates_tags(self):
        """ Tests that data is written to the database when [Sync Updates] is clicked
        """

        expected_data = [
            ['1', '{Tag01,AAA,BBB,CCC}'],
            ['2', '{Tag01,AAA,BBB,CCC}'],
            ['3', '{Tag01,AAA,BBB,CCC}']
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        # Check apply button
        assert bp.operation_apply().is_enabled() is False, 'Apply button is enabled'

        click(bp.sync_updates_button())

        # Check updated data in DB
        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_tags_modified', True),
                        'Unexpected tags data in DB')
