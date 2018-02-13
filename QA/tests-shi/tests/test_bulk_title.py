# /usr/bin/env python
import pytest
import os
from time import sleep
from tests.base import BaseTestClass, BACKSPACE_KEYS, run_sql
from modules.selenium_tools import send_keys, click, wait_for_web_assert
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
    click(bp.edit_part('Title'))
    bp.select_operation(operation)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkTitle(BaseTestClass):

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

    def test_title_add_before_correct(self):
        """ Tests that correct text can be added before
        """
        expected_listings = [
            'hello First something 1234 (1)\n110 characters remaining',
            'hello Second something 1235 (2)\n109 characters remaining',
            'hello Third something LG-512a (3)\n107 characters remaining'
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()
        send_keys(input_field, 'hello ')

        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings

    # --------------------------------------------------------------------------------
    def test_title_add_before_starting_chars(self):
        """ Tests that add before title starts with valid chars
        """
        expected_listings_1 = [
            '123First something 1234 (1)\n113 characters remaining',
            '123Second something 1235 (2)\n112 characters remaining',
            '123Third something LG-512a (3)\n110 characters remaining'
        ]

        expected_listings_2 = [
            '@ First something 1234 (1)\nMust begin with alphanumerical character',
            '@ Second something 1235 (2)\nMust begin with alphanumerical character',
            '@ Third something LG-512a (3)\nMust begin with alphanumerical character'
        ]

        expected_listings_3 = [
            'á First something 1234 (1)\n114 characters remaining',
            'á Second something 1235 (2)\n113 characters remaining',
            'á Third something LG-512a (3)\n111 characters remaining'
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Test 123 prefix - OK
        send_keys(input_field, '123')
        listings = bp.listing_rows_texts_sorted()
        error_msg = bp.error_baloon()
        assert error_msg == ''
        assert listings == expected_listings_1

        # Test @ prefix - show error, temp title does not contain it
        send_keys(input_field, BACKSPACE_KEYS)
        send_keys(input_field, '@ ')
        sleep(2)
        listings = bp.listing_rows_texts_sorted()
        error_msg = bp.error_baloon()
        assert error_msg == 'Must begin with alphanumerical character'
        assert listings == expected_listings_2

        # Test á prefix - no error, temp title contains it
        send_keys(input_field, BACKSPACE_KEYS)
        send_keys(input_field, 'á ')
        listings = bp.listing_rows_texts_sorted()
        error_msg = bp.error_baloon()
        assert error_msg == ''
        assert listings == expected_listings_3

    # --------------------------------------------------------------------------------
    def test_title_add_before_restricted_chars(self):
        """ Tests add before with invalid chars - only one from each group, remaining chars are tested in unit tests
        """

        allowed_char = 'A'
        restricted_char = '%'
        forbidden_char = '$'

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Test single restricted char - OK
        send_keys(input_field, BACKSPACE_KEYS + 'A' + restricted_char)
        error_msg = bp.error_baloon()
        assert error_msg == ''

        # Test double restricted char - Err
        send_keys(input_field, BACKSPACE_KEYS + 'A' + restricted_char + ' ' + restricted_char)
        error_msg = bp.error_baloon()
        assert error_msg == 'Characters % : & must be used at most once'

        # Test forbidden char - Err
        send_keys(input_field, BACKSPACE_KEYS + 'A' + forbidden_char)
        error_msg = bp.error_baloon()
        print("Testing " + forbidden_char, error_msg)
        assert 'allowed' in error_msg

        # Test allowed char - No error message
        send_keys(input_field, BACKSPACE_KEYS + 'A' + allowed_char)
        error_msg = bp.error_baloon()
        print("Testing " + allowed_char, error_msg)
        assert error_msg == ''

    # --------------------------------------------------------------------------------

    def test_title_add_before_restricted_chars_existing(self):
        """ Tests add before where restricted character already exists in the title
        """

        restricted_char = '%'
        expected_listings_1 = [
            'A%First something 1234 (1)\n114 characters remaining',
            'A%Second something 1235 (2)\n113 characters remaining',
            'A%Third something LG-512a (3)\n111 characters remaining'
        ]

        expected_listings_2 = [
            'A%A%First something 1234 (1)\nCharacters % : & must be used at most once',
            'A%A%Second something 1235 (2)\nCharacters % : & must be used at most once',
            'A%A%Third something LG-512a (3)\nCharacters % : & must be used at most once'
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Test single restricted char - OK
        send_keys(input_field, BACKSPACE_KEYS + 'A' + restricted_char)
        error_msg = bp.error_baloon()
        assert error_msg == ''

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        # Test another restricted char - Err
        send_keys(input_field, BACKSPACE_KEYS + 'A' + restricted_char)
        error_msg = bp.error_baloon()
        listings = bp.listing_rows_texts_sorted()
        assert error_msg == ''
        assert listings == expected_listings_2  # Error per listing with double %

    # --------------------------------------------------------------------------------
    def test_title_add_before_length(self):
        """ Tests add before where length limit is exceeded
        """

        long_text = 'Looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong'
        expected_listings_1 = [
            long_text + 'First something 1234 (1)\n2 characters remaining',
            long_text + 'Second something 1235 (2)\n1 character remaining',
            long_text + 'Third something LG-512a (3)\n1 character over limit'
        ]
        expected_listings_2 = [
            long_text + 'First something 1234 (1)\n2 characters remaining',
            long_text + 'Second something 1235 (2)\n1 character remaining',
                        'Third something LG-512a (3)\n113 characters remaining'
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Test long text
        send_keys(input_field, long_text)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_title_add_before_uncheck(self):
        """ Tests add before where a listing is unselected
        """

        expected_listings_1 = [
            'Hello First something 1234 (1)\n110 characters remaining',
            'Hello Second something 1235 (2)\n109 characters remaining',
            'Hello Third something LG-512a (3)\n107 characters remaining'
        ]
        expected_listings_2 = [
            'Hello First something 1234 (1)\n110 characters remaining',
            'Hello Second something 1235 (2)\n109 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining'
        ]

        select_listings_to_edit(self.driver)
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        listing_row = bp.listing_row('Third something LG-512a (3)', bp.TITLE_ROW_SELECTOR)

        # Normal add before
        send_keys(input_field, 'Hello ')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Uncheck Third row

        click(listing_row)
        sleep(2)
        row_class = listing_row.get_attribute('class')
        assert 'selected' not in row_class.split(' ')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        # Check Third row
        click(listing_row)
        sleep(2)
        row_class = listing_row.get_attribute('class')
        assert 'selected' in row_class.split(' ')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Uncheck Third row
        click(listing_row)
        sleep(2)
        row_class = listing_row.get_attribute('class')
        assert 'selected' not in row_class.split(' ')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_title_delete(self):
        """ Tests tile delete basic
        """

        expected_listings_1 = [
            'First something 1234 (1)\n122 characters remaining',
            'Second something 1235 (2)\n115 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining'
        ]

        expected_listings_2 = [
            'Second something 1235 (2)\n115 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining',
            'something 1234 (1)\n122 characters remaining'
        ]

        select_listings_to_edit(self.driver, 'Delete')
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Normal Delete
        send_keys(input_field, 'First ')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_title_delete_first_char(self):
        """ Tests title delete - first character must be alphanumeric
        """

        expected_listings_1 = [
            'First something 1234 (1)\nMust begin with alphanumerical character',
            'Second something 1235 (2)\n115 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining'
        ]

        expected_listings_2 = [
            'First something 1234 (1)\n116 characters remaining',
            'Second something 1235 (2)\n115 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining'
        ]

        select_listings_to_edit(self.driver, 'Delete')
        d = self.driver
        bp = BulkPage(d)

        input_field = bp.operation_input()

        # Normal Delete
        send_keys(input_field, 'First')      # title starts with a space now -> Error
        sleep(2)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_2

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    # --------------------------------------------------------------------------------
    def test_title_replace(self):
        """ Tests title replace - basic test
        """

        expected_listings_1 = [
            'Prvni something 1234 (1)\n116 characters remaining',
            'Second something 1235 (2)\n115 characters remaining',
            'Third something LG-512a (3)\n113 characters remaining'
        ]

        select_listings_to_edit(self.driver, 'Find & Replace')
        d = self.driver
        bp = BulkPage(d)

        input_find_field = bp.operation_input_find()
        input_replace_field = bp.operation_input_replace()

        # Normal Replace
        send_keys(input_find_field, 'First')
        send_keys(input_replace_field, 'Prvni')
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        # Apply (client only)
        click(bp.operation_apply())
        sleep(1)
        listings = bp.listing_rows_texts_sorted()
        assert listings == expected_listings_1

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkTitleSync(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.set_etsy_testcase(self, 'tc1')

    def setup_method(self, method):
        super().setup_method(method)
        self.stop_all()
        setup_rabbit()
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    def test_sync_updates_title(self):
        """ Tests that data is written to the database when [Sync Updates] is clicked
            It also tests that data are correctly processed in more than one batch (see HIVE-1216).
        """

        # Configure Hive to process changes in batches of two listings
        # Env variable must be set before Hive is started
        os.environ['SYNC_UPDATES_BATCH_SIZE'] = '2'

        expected_data = [
            ['1', 'hello First something 1234 (1)'],
            ['2', 'hello Second something 1235 (2)'],
            ['3', 'hello Third something LG-512a (3)']
        ]

        select_listings_to_edit(self.driver)
        bp = BulkPage(self.driver)

        input_field = bp.operation_input()
        send_keys(input_field, 'hello ')

        # click on Apply and check Apply button
        click(bp.operation_apply())
        wait_for_web_assert(False, bp.operation_apply().is_enabled, 'Apply button is enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check data in DB
        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_title_modified', True),
                        'Unexpected title data in DB')
