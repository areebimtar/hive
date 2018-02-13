from tests.base import run_sql
from modules.testing import wait_for_assert
from tests.etsy_emulator_support import EtsyEmulatorInterface

# Initial values of variation properties in listings_13.sql
DB_INITIAL_VARIATION_PROPERTIES = [
    ['2', 't', '200', 'Primary color', '', 't', 'f', 'f'],
    ['3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
    ['3', 'f', '507', 'Material', '', 't', 't', 'f']
]

# Initial values of variation options in listings_13.sql
DB_INITIAL_VARIATION_OPTIONS = [
    ['2', 't', '1213', 'Beige', '1'],
    ['2', 't', '1', 'Black', '2'],
    ['2', 't', '2', 'Blue', '3'],
    ['2', 't', '1215', 'Silver', '4'],
    ['2', 't', '10', 'White', '5'],
    ['2', 't', '11', 'Yellow', '6'],
    ['2', 't', '105393734419', 'Custom color 1', '7'],
    ['2', 't', '50541869803', 'Custom color 2', '8'],
    ['3', 't', '1672', 'XXS', '1'],
    ['3', 't', '1795', 'One size (plus)', '2'],
    ['3', 't', '102314214578', 'Custom size 1', '3'],
    ['3', 'f', '5561256091', 'Material 1', '1'],
    ['3', 'f', '5561256101', 'Material 2', '2'],
    ['3', 'f', '9932879796', 'Material 3', '3']
]


def check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options):
    wait_for_assert(expected_product_offerings,
                    lambda: run_sql('HIVE', 'select_product_offerings_short', True),
                    'Product offerings in DB are incorrect')

    variation_properties = run_sql('HIVE', 'select_variation_properties', True)
    assert variation_properties == expected_variation_properties

    variation_options = run_sql('HIVE', 'select_variation_options', True)
    assert variation_options == expected_variation_options


def check_etsy_emulator_requests(expected_api_calls):
    emulator_interface = EtsyEmulatorInterface()

    # wait for the changes to synchronize to etsy (emulator)
    wait_for_assert(True,
                    lambda: len(emulator_interface.get_api_calls()) >= 8,
                    "Not enough calls made to Etsy emulator", retries=30)
    expected_db_shop_status = [['GetvelaTest2', 'up_to_date', 'f', '']]
    wait_for_assert(expected_db_shop_status, lambda: run_sql('HIVE', 'select_shop_status', True),
                    "Shop not synced", retries=30)

    # Check Etsy API calls
    emulator_interface.validate_api_calls(expected_api_calls,
                                          sort=True,
                                          normalize_func=emulator_interface.normalize_update_api_calls,
                                          message='Unexpected API PUT requests')
