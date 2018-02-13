# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestInventoryImport(BaseTestClass):

    # --- Tests ---

    def test_inventory_import(self):
        """ Test verifies that variations are correctly imported from Etsy - new inventory API
        Tests functionality introduced in HIVE-978 and HIVE-1019.
        """
        self.set_etsy_testcase('listings_51')
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        self.restart_all()

        d = self.driver
        d.delete_all_cookies()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)
        lpg.go_to_etsy()

        lpg.wait_during_sync_from_etsy()

        d.get(self.base_url)

        expected_data = [
            ['Product #1 without variations', '500.00', '550', '50', 't', '', '', '', '', '', '', '', '', '', ''],
            ['Product #2 with one variation with pricing', '1.00', '111', '11', 't', '1213', 'Beige', '1', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '2.00', '111', '11', 't', '1', 'Black', '2', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '3.00', '111', '11', 'f', '2', 'Blue', '3', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '4.00', '111', '11', 'f', '1215', 'Silver', '4', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '5.00', '111', '11', 't', '10', 'White', '5', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '6.00', '111', '11', 't', '11', 'Yellow', '6', 't', '200',
             'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '7.00', '111', '11', 't', '105393734419', 'Custom color 1',
             '7', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['Product #2 with one variation with pricing', '8.00', '111', '11', 't', '50541869803', 'Custom color 2',
             '8', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '10.00', '222', '1', 't',
             '1672', 'XXS', '1', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '10.00', '222', '1', 't',
             '5561256091', 'Material 1', '1', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '20.00', '222', '2', 't',
             '1672', 'XXS', '1', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '20.00', '222', '2', 't',
             '5561256101', 'Material 2', '2', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '30.00', '222', '3', 't',
             '1672', 'XXS', '1', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '30.00', '222', '3', 't',
             '9932879796', 'Material 3', '3', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '40.00', '222', '4', 't',
             '1795', 'One size (plus)', '2', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '40.00', '222', '4', 't',
             '5561256091', 'Material 1', '1', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '50.00', '222', '5', 'f',
             '1795', 'One size (plus)', '2', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '50.00', '222', '5', 'f',
             '5561256101', 'Material 2', '2', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '60.00', '222', '6', 't',
             '1795', 'One size (plus)', '2', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '60.00', '222', '6', 't',
             '9932879796', 'Material 3', '3', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '70.00', '222', '7', 't',
             '102314214578', 'Custom size 1', '3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '70.00', '222', '7', 't',
             '5561256091', 'Material 1', '1', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '80.00', '222', '8', 't',
             '102314214578', 'Custom size 1', '3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '80.00', '222', '8', 't',
             '5561256101', 'Material 2', '2', 'f', '507', 'Material', '', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '90.00', '222', '9', 't',
             '102314214578', 'Custom size 1', '3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['Product #3 with two variations with quantity on both and pricing on both', '90.00', '222', '9', 't',
             '9932879796', 'Material 3', '3', 'f', '507', 'Material', '', 't', 't', 'f']
        ]

        # check product offerings data in DB
        data = run_sql('HIVE', 'select_product_offerings', True)
        print(data)
        assert data == expected_data
