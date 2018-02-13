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
    click(bp.edit_part('Materials'))
    bp.select_operation(operation)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkMaterials(BaseTestClass):

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

    # --- Tests ---

    def test_create_material(self):
        """ Tests that a material can be created in bulk edit
        """
        expected_materials = [
            ['cotton', 'AAA'],
            ['cotton', 'AAA'],
            ['wool', 'AAA'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_create_material_too_long(self):
        """ Tests that a material cannot be longer than 45 characters
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAAAaBBBBbCCCCcDDDDdEEEEeFFFFfGGGGgHHHHhIIIIi')
        err = bp.error_baloon()
        assert err == ""

        send_keys(bp.operation_input(), 'J')
        err = bp.error_baloon()
        assert err == "Materials must be 45 characters or less."

    # --------------------------------------------------------------------------------
    def test_create_material_special_chars(self):
        """ Tests that a material can be created in bulk edit with czech chars, but not special chars
        """
        expected_materials = [
            ['cotton', 'žvýkačky'],
            ['cotton', 'žvýkačky'],
            ['wool', 'žvýkačky'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'žvýkačky')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials

        send_keys(bp.operation_input(), 'me@site')
        err = bp.error_baloon()
        assert err == "Materials can only include spaces, letters, and numbers."

    # --------------------------------------------------------------------------------
    def test_create_material_multi_basic(self):
        """ Tests that multiple materials can be created in bulk edit
        """
        expected_materials = [
            ['cotton', 'AAA', 'BBB', 'CCC'],
            ['cotton', 'AAA', 'BBB', 'CCC'],
            ['wool', 'AAA', 'BBB', 'CCC'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials

    # --------------------------------------------------------------------------------
    def test_create_material_multi_over(self):
        """ Tests that multiple materials can be created in bulk edit, but no more than 13
        """
        expected_materials_01 = [
            ['cotton'],
            ['cotton'],
            ['wool', 'AAA', 'BBB', 'CCC'],
        ]

        expected_materials_02 = [
            ['cotton', '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
            ['cotton', '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
            ['wool', 'AAA', 'BBB', 'CCC', '00', '01', '02', '03', '04', '05', '06', '07', '08'],
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        # deselect 2, 3
        bp.click_on_listings(['Second something 1235 (2)', 'Third something LG-512a (3)'])

        # append AAA BBB CCC materials to the 1st listing
        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials_01

        # append 00, 01, 02... to all listings
        bp.click_on_listings(['Second something 1235 (2)', 'Third something LG-512a (3)'])
        send_keys(bp.operation_input(), '00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials_02

    # --------------------------------------------------------------------------------
    def test_delete_single_material(self):
        """ Tests that single material can be deleted
        """
        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        row = bp.listing_row('First something 1234 (1)')
        material_names = bp.material_names(row)
        assert material_names == ['wool']

        materials = bp.material_elements(row)
        close_icon = materials[0].find_element_by_css_selector('span.close')
        click(close_icon)
        sleep(1)

        material_names = bp.material_names(bp.listing_row('First something 1234 (1)'))
        assert material_names == []

        titles = bp.listing_rows_texts_sorted()
        assert titles[0] == "First something 1234 (1)\n13 remaining"

    # --------------------------------------------------------------------------------
    def test_delete_material(self):
        """ Tests that materials can be deleted in bulk
        """
        expected_materials = [
            [],
            ['cotton'],
            ['cotton'],
        ]

        select_listings_to_edit(self.driver, 'Delete')
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'wool')
        click(bp.operation_apply())

        material_names = bp.material_names()
        assert material_names == expected_materials


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkMaterialsSync(BaseTestClass):
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

    def test_sync_updates_materials(self):
        """ Tests that data is written to the database when [Sync Updates] is clicked
        """
        expected_data = [
            ['1', '{wool,AAA,BBB,CCC}'],
            ['2', '{cotton,AAA,BBB,CCC}'],
            ['3', '{cotton,AAA,BBB,CCC}']
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        send_keys(bp.operation_input(), 'AAA,BBB   ,CCC')
        click(bp.operation_apply())

        click(bp.sync_updates_button())

        # Check updated data in DB
        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_materials_modified', True),
                        'Unexpected materials data in DB')
