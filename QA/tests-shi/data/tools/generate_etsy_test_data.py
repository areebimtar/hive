#!/usr/bin/env python3

# -------------------------------------------------------------------------------------------------------
# This script downloads data from real Etsy and generates test data for etsy emulator from it
# - it overwrites existing data for etsy emulator in the repo
# PREREQUISITE for this script is that listings from which test data are created are NOT CHANGED on Etsy.
# Shop GetvelaTest2 is used for downloading the listings' data.
# -------------------------------------------------------------------------------------------------------

import copy
import os
import json
import sys
from requests_oauthlib import OAuth1Session

# Env variables have to be set in order to download listings' data from Etsy
try:
    ETSY_CLIENT_TOKEN = os.environ['ETSY_CLIENT_TOKEN']
    ETSY_CLIENT_SECRET = os.environ['ETSY_CLIENT_SECRET']
    USER_TOKEN = os.environ['USER_TOKEN_GETVELA2']
    USER_SECRET = os.environ['USER_SECRET_GETVELA2']
except KeyError:
    print('ERROR: Following environment variables must be set in order to get data from Etsy: ETSY_CLIENT_TOKEN, '
          'ETSY_CLIENT_SECRET, USER_TOKEN_GETVELA2, USER_SECRET_GETVELA2', file=sys.stderr)
    exit(1)

URL_PREFIX = 'http://openapi.etsy.com'
GET_LISTING_URL = '/v2/listings/{listing_id}?includes=' \
    'User,Shop,Section,Images,MainImage,Translations,Manufacturers,Inventory,Attributes&language=en'
GET_LISTING_IMAGES_URL = '/v2/listings/{listing_id}/images'

# IDs of real listings on Etsy in test shop GetvelaTest2
FIRST_TO_SIXTH = ['555235915', '541990532', '555786717', '555786807', '555786873', '541990950']
ONE_TWO = ['524509282', '538317889']
ONE_TWO_THREE = ONE_TWO + ['524509390']
ONE_TO_FOUR = ONE_TWO_THREE + ['538317935']
INVENTORY = ['511966073', '511293105', '496842422']
SPECIAL_CHARS = ['542222458']
ONE_DRAFT = ['542256792']
DRAFT_EXPIRED_INVALID = ONE_DRAFT + ['542258332', '556055241', '542261216', '556057101', '542261454']

SUMMER_SALE_SECTION_ID = 17365192
SUMMER_SALE_SECTION_RANK = 3

ON_SALE_SECTION_ID = 15183328
ON_SALE_SECTION_RANK = 1

CREATION_TSZ = 1426453409
LAST_MODIFIED_TSZ = 1450269283
LAST_MODIFIED_TSZ_LATER = 1504086100

SHOP_ID = '14458117'
USER_ID = 106321453

LISTING_KEYS_SHORT = ('listing_id', 'original_creation_tsz', 'last_modified_tsz', 'can_write_inventory', 'state')

LISTING_DATA_SHORT = {
    'can_write_inventory': True,
    'last_modified_tsz': LAST_MODIFIED_TSZ,
    'original_creation_tsz': CREATION_TSZ,
    'listing_id': 100001,
    'state': 'draft'
}

DRAFT_LISTINGS_TEMPLATE = {
    'count': 1,
    'pagination': {
        'effective_limit': 100000,
        'effective_offset': 0,
        'effective_page': 1,
        'next_offset': None,
        'next_page': None
    },
    'params': {
        'limit': '100',
        'offset': 0,
        'page': None,
        'shop_id': '14458117'
    },
    'results': [
        LISTING_DATA_SHORT
    ],
    'type': 'Listing'
}

SECTIONS_TEMPLATE = {
    'count': 0,
    'results': [],
    'params': {
        'shop_id': SHOP_ID
    },
    'type': 'ShopSection',
    'pagination': {}
}

ETSY_TESTS_PATH = os.path.join(os.environ['HIVE_TEST_DIR'], 'etsy-emulator', 'tests')

# Expected listing timestamps on Etsy - used for checking whether source data on Etsy changed
LISTING_TIMESTAMPS = {
    '524509390': 1505129307,
    '496842422': 1504196093,
    '511293105': 1504195753,
    '542261454': 1514991479,
    '556057101': 1504622286,
    '542222458': 1504610418,
    '555786717': 1504542875,
    '542258332': 1504621539,
    '555786807': 1504542875,
    '538317935': 1505129311,
    '555235915': 1514991096,
    '538317889': 1505129303,
    '542261216': 1504622262,
    '542256792': 1504621110,
    '511966073': 1504195471,
    '541990532': 1504542875,
    '541990950': 1504542875,
    '524509282': 1505141396,
    '556055241': 1504621808,
    '555786873': 1504542875
}


def add_section_to_sections_response(sections_response, **kwargs):
    """ Adds a new section dict to GET sections API response data

    :param sections_response: data of prepared GET /v2/shops/1234/sections API response
    :param kwargs: fields of a new section dict to fill
    :return:
    """
    results = sections_response['results']
    rank = len(results) + 1
    section_dict = dict(kwargs)
    section_dict['rank'] = rank
    section_dict['user_id'] = USER_ID
    if 'active_listing_count' not in section_dict.keys():
        section_dict['active_listing_count'] = 0
    results.append(section_dict)
    sections_response['count'] = len(results)


def prepare_listing_list(data):
    """ Generate response for listing list (i.e. /v2/shops/1234/listings/draft) from array of API listing responses

    :param data: array of API listing responses (dictionaries)
    :return: listing list API response in form of dictionary
    """
    listing_list_response = copy.deepcopy(DRAFT_LISTINGS_TEMPLATE)
    listing_list_response['count'] = len(data)
    del listing_list_response['results'][0]

    for listing_response in data:
        listing = listing_response['results'][0]
        obj = dict()
        # pick only certain keys:value pairs - depends on API request parameters
        for k in LISTING_KEYS_SHORT:
            try:
                obj[k] = listing[k]
            except KeyError:
                # if key is not present, ignore it
                pass

        listing_list_response['results'].append(obj)

    return listing_list_response


def get_one_listing_response(oauth1_session, listing_id):
    """ Get a HTTP JSON response for one listing from Etsy

    :param oauth1_session: OAuth session object
    :param listing_id: Etsy ID of the listing
    :return: exact HTTP response converted from json to python dictionary
    """
    print('Downloading listing data from Etsy, listing id %s' % listing_id)
    response = oauth1_session.get(URL_PREFIX + GET_LISTING_URL.format(listing_id=listing_id))
    try:
        data = response.json()
    except json.decoder.JSONDecodeError:
        print('Failed to decode JSON: ' + response.text, file=sys.stderr)
        raise Exception('Error reading listing %s' % listing_id)

    timestamp = data['results'][0]['last_modified_tsz']
    title = data['results'][0]['title']
    expected_timestamp = LISTING_TIMESTAMPS[listing_id]
    if expected_timestamp != timestamp:
        print('WARNING: It seems the listing with ID %s was changed (expected timestamp %d, got %d), compare following '
              'listing on Etsy and in existing test data: "%s"' %
              (listing_id, expected_timestamp, timestamp, title), file=sys.stderr)
    return data


def get_one_listing_images_response(oauth1_session, listing_id):
    """ Get a HTTP JSON response for list of images of one listing from Etsy

    :param oauth1_session: OAuth session object
    :param listing_id: Etsy ID of the listing
    :return: exact HTTP response converted from json to python dictionary
    """
    print('Downloading listing images data from Etsy, listing id %s' % listing_id)
    response = oauth1_session.get(URL_PREFIX + GET_LISTING_IMAGES_URL.format(listing_id=listing_id))
    return response.json()


def get_multiple_listings_responses(oauth1_session, listing_id_list):
    """ Get multiple HTTP JSON responses for multiple listings from Etsy

    :param oauth1_session: OAuth session object
    :param listing_id_list: list of Etsy IDs of listing
    :return: list of exact HTTP JSON responses converted from json to python dictionary
    """
    data = []
    for listing_id in listing_id_list:
        data.append(get_one_listing_response(oauth1_session, listing_id))
    return data


def get_multiple_listing_images_responses(oauth1_session, listing_id_list):
    """ Get multiple HTTP JSON responses for multiple listings' lists of images from Etsy

    :param oauth1_session: OAuth session object
    :param listing_id_list: list of Etsy IDs of listing
    :return: list of exact HTTP JSON responses converted from json to python dictionary
    """
    data = []
    for listing_id in listing_id_list:
        data.append(get_one_listing_images_response(oauth1_session, listing_id))
    return data


def change_all_listings_responses(listings_responses, start_id, **kwargs):
    """ Modify all saved Etsy API listing responses

    :param listings_responses: list of Etsy responses - data to be modified
    :param start_id: new listing_id for the first listing, is increased by one for each other listing
    :param kwargs: other parameters we want to change, name of the parameter is the key in the Etsy JSON,
                   value of the parameter is the new value
    """
    for new_listing_id, listing_response in enumerate(listings_responses, start_id):
        change_one_listing_response(listing_response, listing_id=new_listing_id, **kwargs)


def change_all_listing_images_responses(listings_images_responses, start_id):
    """ Modify all saved Etsy API listings' images responses

    :param listings_images_responses: list of Etsy responses - data to be modified
    :param start_id: new listing_id for the first response, is increased by one for each other response
    """
    for new_listing_id, listing_image_response in enumerate(listings_images_responses, start_id):
        change_one_listing_images_response(listing_image_response, new_listing_id)


def change_one_listing_response(listing_response, _path=None, listing_id=None, **kwargs):
    """ Modify saved Etsy API listing response

    :param listing_response: Etsy response (as dictionary) - data to be modified
    :param _path: path in the structure (dictionary) to Etsy JSON parameters we want to change
    :param listing_id: new listing_id
    :param kwargs: other parameters we want to change, name of the parameter is the key in the Etsy JSON,
                   value of the parameter is the new value
    """

    listing_data = listing_response['results'][0]

    if listing_id:
        listing_response['params']['listing_id'] = listing_id
        listing_data['listing_id'] = listing_id
        listing_data['MainImage']['listing_id'] = listing_id
        for section_name in ['Images', 'Translations']:
            for item in listing_data[section_name]:
                item['listing_id'] = listing_id

    data = listing_data
    if _path:
        for level in _path:
            data = data[level]

    for key in kwargs:
        data[key] = kwargs[key]


def change_one_listing_images_response(listing_images_response, listing_id):
    """ Modify saved Etsy API listing images response (as dictionary

    :param listing_images_response: Etsy JSON response - data to be modified
    :param listing_id: new listing_id
    """
    listing_images_response['params']['listing_id'] = listing_id
    for image_data in listing_images_response['results']:
        image_data['listing_id'] = listing_id


def write_json_file(data, file_name):
    """ Write data to a JSON file

    :param data: data to be written
    :param file_name: name of the JSON file
    """
    with open(os.path.join(ETSY_TESTS_PATH, file_name), 'w') as fw:
        json.dump(data, fw, sort_keys=True, indent=4)
    print('File %s was generated.' % file_name)


def write_json_data_file(data_array, file_name):
    """ Write multiple JSON data to file. Each JSON is saved as one line in the file

    :param data_array: array of data to be written as JSON lines
    :param file_name: name of the "JSON" file
    """
    with open(os.path.join(ETSY_TESTS_PATH, file_name), 'w') as fw:
        for item in data_array:
            fw.write(json.dumps(item, sort_keys=True) + '\n')
    print('File %s was generated.' % file_name)


def generate_listings_14_active(oauth_session):
    """ Generate listings_14_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TO_FOUR)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    write_json_data_file(data, 'listings_14_active.json')


def generate_listings_push_images_images(oauth_session):
    """ Generate listings_push_images_images.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listing_images_responses(oauth_session, ONE_TO_FOUR)
    change_all_listing_images_responses(data, 100001)

    write_json_data_file(data, 'listings_push_images_images.json')


def generate_listings_delete_holiday_bulk_active(oauth_session):
    """ Generate listings_delete_holiday_bulk_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TO_FOUR)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # delete Attributes from listings Two and Three
    change_one_listing_response(data[1], Attributes=[])
    change_one_listing_response(data[2], Attributes=[])
    write_json_data_file(data, 'listings_delete_holiday_bulk_active.json')


def generate_listings_delete_holiday_inline_active(oauth_session):
    """ Generate listings_delete_holiday_inline_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TO_FOUR)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # delete Attributes from listing Two
    change_one_listing_response(data[1], Attributes=[])
    write_json_data_file(data, 'listings_delete_holiday_inline_active.json')


def generate_listings_delete_occasion_active(oauth_session):
    """ Generate listings_delete_occasion_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TO_FOUR)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # delete Attributes from listing One
    change_one_listing_response(data[0], Attributes=[])
    write_json_data_file(data, 'listings_delete_occasion_active.json')


def generate_listings_null_character_active(oauth_session):
    """ Generate listings_null_character_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TWO)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # change descriptions
    change_one_listing_response(data[0], description='Description with null character\u0000')
    change_one_listing_response(data[1], description='Description without null character')
    write_json_data_file(data, 'listings_null_character_active.json')


def generate_listings_state_change_listings(oauth_session):
    """ Generate listings_state_change_listings.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TO_FOUR)
    change_all_listings_responses(data,
                                  100001,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)

    # change status and modification time of listings
    change_one_listing_response(data[0], state='active', last_modified_tsz=LAST_MODIFIED_TSZ)
    change_one_listing_response(data[1], state='active', last_modified_tsz=LAST_MODIFIED_TSZ)
    change_one_listing_response(data[2], state='draft', last_modified_tsz=LAST_MODIFIED_TSZ_LATER)
    change_one_listing_response(data[3], state='draft', last_modified_tsz=LAST_MODIFIED_TSZ_LATER)

    write_json_data_file(data, 'listings_state_change_listings.json')


def generate_listings_51_active(oauth_session):
    """ Generate listings_51_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, INVENTORY)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    write_json_data_file(data, 'listings_51_active.json')


def prepare_listings_first_to_sixth(oauth_session):
    """ Prepare data from the set of six listings - listings + sections

    :param oauth_session: OAuth session object
    :return: array of prepared API responses
    """
    data = get_multiple_listings_responses(oauth_session, FIRST_TO_SIXTH)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    for i in [0, 1, 3]:
        change_one_listing_response(data[i], shop_section_id=SUMMER_SALE_SECTION_ID)
        change_one_listing_response(data[i],
                                    _path=['Section'],
                                    shop_section_id=SUMMER_SALE_SECTION_ID,
                                    rank=SUMMER_SALE_SECTION_RANK,
                                    active_listing_count=3)

    for i in [2, 4]:
        change_one_listing_response(data[i], shop_section_id=ON_SALE_SECTION_ID)
        change_one_listing_response(data[i],
                                    _path=['Section'],
                                    shop_section_id=ON_SALE_SECTION_ID,
                                    rank=ON_SALE_SECTION_RANK,
                                    active_listing_count=2)
    return data


def generate_listings_02_active(oauth_session):
    """ Generate listings_02_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """

    data = prepare_listings_first_to_sixth(oauth_session)
    write_json_data_file(data, 'listings_02_active.json')


def generate_listings_invalid_states_data_and_lists(oauth_session):
    """ Generate listings_invalid_states_*.json files
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to files.

    :param oauth_session: OAuth session object
    """

    data = prepare_listings_first_to_sixth(oauth_session)

    del data[0]['results'][0]['state']
    change_one_listing_response(data[1], state=None)
    change_one_listing_response(data[2], state='null')
    change_one_listing_response(data[3], state='edit')
    change_one_listing_response(data[4], state='unavailable')
    change_one_listing_response(data[5], title='prefix Sixth something')

    write_json_data_file(data, 'listings_invalid_states_data.json')

    # save first three to inactive list and second three to active list
    inactive = data[0:3]
    active = data[3:]

    list_data = prepare_listing_list(inactive)
    write_json_file(list_data, 'listings_invalid_states_inactive_list.json')

    list_data = prepare_listing_list(active)
    write_json_file(list_data, 'listings_invalid_states_active_list.json')


def generate_listings_03_active(oauth_session):
    """ Generate listings_03_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, FIRST_TO_SIXTH)

    # let's multiply listings, product_ids and offering_ids won't be correct, however we don't import them (yet)
    new_data = []
    for i in range(102):
        listings_results = copy.deepcopy(data[i % 6])
        title = listings_results['results'][0]['title']
        change_one_listing_response(listings_results, title='%s (%d)' % (title, i + 1))
        new_data.append(listings_results)

    change_all_listings_responses(new_data,
                                  100001,
                                  state='active',
                                  Section=None,
                                  shop_section_id=None,
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)

    write_json_data_file(new_data, 'listings_03_active.json')


def generate_listings_04_active(oauth_session):
    """ Generate listings_04_active.json file
    Data of the listing are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, SPECIAL_CHARS)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    write_json_data_file(data, 'listings_04_active.json')


def generate_listings_09_active(oauth_session):
    """ Generate listings_09_active.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, DRAFT_EXPIRED_INVALID)
    change_all_listings_responses(data,
                                  100001,
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    for i in [0, 1, 2]:
        change_one_listing_response(data[i], state='draft')
    for i in [3, 4]:
        change_one_listing_response(data[i], state='expired')
    change_one_listing_response(data[5], state='inactive')

    for i in range(6):
        change_one_listing_response(data[i], shop_section_id=SUMMER_SALE_SECTION_ID)
        change_one_listing_response(data[i],
                                    _path=['Section'],
                                    shop_section_id=SUMMER_SALE_SECTION_ID,
                                    rank=SUMMER_SALE_SECTION_RANK,
                                    active_listing_count=0)

    write_json_data_file(data, 'listings_09_active.json')


def generate_listings_status_unavailable_data(oauth_session):
    """ Generate listings_status_unavailable_data.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """

    keys_to_delete = [
        'processing_max', 'featured_rank', 'category_path_ids', 'should_auto_renew', 'non_taxable', 'url', 'occasion',
        'processing_min', 'is_customizable', 'last_modified_tsz', 'shop_section_id', 'views', 'file_data',
        'original_creation_tsz', 'style', 'ending_tsz', 'quantity', 'title', 'user_id', 'materials', 'price',
        'description', 'has_variations', 'creation_tsz', 'tags', 'state_tsz', 'currency_code', 'can_write_inventory',
        'item_weight_units', 'Inventory', 'recipient', 'shipping_template_id', 'num_favorers', 'language', 'Attributes'
    ]

    data = get_multiple_listings_responses(oauth_session, ONE_DRAFT)
    change_all_listings_responses(data,
                                  100001,
                                  state='unavailable',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ,
                                  Section=None)

    for key in keys_to_delete:
        del data[0]['results'][0][key]

    write_json_data_file(data, 'listings_status_unavailable_data.json')


def generate_template_gv2_single_draft(oauth_session):
    """ Generate template_gv2_single_draft.json file
    Data of the listing are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """

    data = get_multiple_listings_responses(oauth_session, ONE_DRAFT)
    change_all_listings_responses(data,
                                  100001,
                                  state='draft',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    change_one_listing_response(data[0], shop_section_id=SUMMER_SALE_SECTION_ID)
    change_one_listing_response(data[0],
                                _path=['Section'],
                                shop_section_id=SUMMER_SALE_SECTION_ID,
                                rank=SUMMER_SALE_SECTION_RANK,
                                active_listing_count=0)

    struct = {
        '_doc': 'This template for shop returns 1 draft listing',
        'GET': {
            '/v2/shops/14458117/listings/draft': {
                'function': 'fixed_json',
                'data': {
                    'body': DRAFT_LISTINGS_TEMPLATE
                }
            },
            '/v2/listings/100001': {
                'function': 'fixed_json',
                'data': {
                    'body': data[0]
                }
            }
        }
    }

    write_json_file(struct, 'template_gv2_single_draft.json')


def generate_listings_missing_title_data(oauth_session):
    """ Generate listings_missing_title_data.json file
    Data of listing are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """

    data = get_multiple_listings_responses(oauth_session, ONE_DRAFT)
    change_all_listings_responses(data,
                                  100001,
                                  state='draft',
                                  last_modified_tsz=LAST_MODIFIED_TSZ_LATER,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    change_one_listing_response(data[0], shop_section_id=SUMMER_SALE_SECTION_ID)
    change_one_listing_response(data[0],
                                _path=['Section'],
                                shop_section_id=SUMMER_SALE_SECTION_ID,
                                rank=SUMMER_SALE_SECTION_RANK,
                                active_listing_count=0)
    del data[0]['results'][0]['title']

    write_json_data_file(data, 'listings_missing_title_data.json')


def generate_listings_15_active(oauth_session):
    """ Generate listings_15.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TWO)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # change retail/wholesale flag
    change_one_listing_response(data[1], can_write_inventory=False)
    write_json_data_file(data, 'listings_15_active.json')


def generate_listings_16_active(oauth_session):
    """ Generate listings_16.json file
    Data of listings are downloaded from Etsy, modified as needed for the test data and saved to a file.

    :param oauth_session: OAuth session object
    """
    data = get_multiple_listings_responses(oauth_session, ONE_TWO_THREE)
    change_all_listings_responses(data,
                                  100001,
                                  state='active',
                                  last_modified_tsz=LAST_MODIFIED_TSZ,
                                  creation_tsz=CREATION_TSZ,
                                  original_creation_tsz=CREATION_TSZ)
    # change retail/wholesale flag and taxonomy where needed
    change_one_listing_response(data[1], can_write_inventory=False)
    change_one_listing_response(data[2], can_write_inventory=False, taxonomy_id=1, taxonomy_path=['Accessories'])
    write_json_data_file(data, 'listings_16_active.json')

    list_data = prepare_listing_list(data)
    write_json_file(list_data, 'listings_16_active_list.json')


def generate_listings_add_new_section_secdata():
    """ Generates listings_add_new_section_secdata.json file - responses on GET /v2/shop/1234/sections
        for add new section to Etsy scenario.
        Generated from template only, real Etsy not used.
    """
    sections_response = copy.deepcopy(SECTIONS_TEMPLATE)
    add_section_to_sections_response(sections_response,
                                     title='On Sale',
                                     shop_section_id=15183328,
                                     active_listing_count=2)
    add_section_to_sections_response(sections_response,
                                     title='Holiday Gifts',
                                     shop_section_id=15180189)
    add_section_to_sections_response(sections_response,
                                     title='Summer Sale',
                                     shop_section_id=17365192,
                                     active_listing_count=3)
    add_section_to_sections_response(sections_response,
                                     title='de',
                                     shop_section_id=18790753)
    add_section_to_sections_response(sections_response,
                                     title='bbbaa',
                                     shop_section_id=18787742)
    add_section_to_sections_response(sections_response,
                                     title='eeee',
                                     shop_section_id=18790755)

    first_response = copy.deepcopy(sections_response)
    add_section_to_sections_response(sections_response,
                                     title='New section',
                                     shop_section_id=66666666)

    write_json_data_file([first_response] + [sections_response] * 5, 'listings_add_new_section_secdata.json')

if __name__ == '__main__':
    session = OAuth1Session(client_key=ETSY_CLIENT_TOKEN,
                            client_secret=ETSY_CLIENT_SECRET,
                            resource_owner_key=USER_TOKEN,
                            resource_owner_secret=USER_SECRET)

    generate_listings_14_active(session)
    generate_listings_15_active(session)
    generate_listings_16_active(session)
    generate_listings_push_images_images(session)
    generate_listings_delete_holiday_bulk_active(session)
    generate_listings_delete_holiday_inline_active(session)
    generate_listings_delete_occasion_active(session)
    generate_listings_null_character_active(session)
    generate_listings_state_change_listings(session)
    generate_listings_51_active(session)
    generate_listings_02_active(session)
    generate_listings_invalid_states_data_and_lists(session)
    generate_listings_03_active(session)
    generate_listings_04_active(session)
    generate_listings_09_active(session)
    generate_template_gv2_single_draft(session)
    generate_listings_missing_title_data(session)
    generate_listings_status_unavailable_data(session)
    generate_listings_add_new_section_secdata()
