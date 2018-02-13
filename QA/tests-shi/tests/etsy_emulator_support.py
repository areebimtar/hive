import requests
import json
import difflib
import re
import os
from subprocess import call
from time import sleep


class EtsyEmulatorError(Exception):
    pass


class EtsyEmulatorRestartError(EtsyEmulatorError):
    pass


class EtsyEmulatorRequestError(EtsyEmulatorError):
    pass


class EtsyEmulatorResponseError(EtsyEmulatorError):
    pass


def print_api_calls_diff(expected_data, actual_data):
    """
    Print difference between api calls arrays

    :param expected_data: array of expected api calls
    :param actual_data: array of api calls from Etsy emulator
    :return:
    """
    str1 = json.dumps(expected_data, sort_keys=True, indent=2)
    str2 = json.dumps(actual_data, sort_keys=True, indent=2)

    print('Difference between API calls:')
    print(''.join(difflib.ndiff(str1.splitlines(keepends=True), str2.splitlines(keepends=True))))


class EtsyEmulatorInterface(object):
    """
    This class serves as helper interface for etsy emulator
    - get requests sent to etsy emulator
    - filter and normalize requests in order to be comparable with expected data
    - validate requests against expected data

    Also see script data/tools/api_requests2test_data.py - script for test data preparation from actual calls
    to etsy emulator.
    """

    def __init__(self):
        self.etsy_host = os.environ['QA_ETSY_HOST']
        self.etsy_port = os.environ['QA_ETSY_PORT']
        self.etsy_url = 'http://' + self.etsy_host + ':' + self.etsy_port

    def get_api_calls(self):
        """ Call Etsy emulator, get list of calls made.
        :return: json array - list of api calls
        """
        url = self.etsy_url + '/requests'
        try:
            r = requests.get(url)
        except requests.exceptions.RequestException as e:
            raise EtsyEmulatorRequestError(str(e))

        if r.status_code != 200:
            raise EtsyEmulatorResponseError("Error: get API calls from " + url)
        return r.json()

    @staticmethod
    def normalize_update_api_calls(data):
        """ normalize result from get_api_calls()
        - take only PUT or POST API calls
        - unpack body.products string into normal json
        :return: yield  ['PUT': '/v2/foo',  'body': {' _products_unpacked': {},...}, ...]
        """

        for i in data:
            result = {i['method']: i['url']}
            if i['method'] in ['POST', 'PUT', 'DELETE']:
                body = i['body'].copy()
                if 'products' in body:
                    body['_products_unpacked'] = json.loads(body['products'])  # unpack json string
                    del body['products']
                result['body'] = body
                yield result

    @staticmethod
    def is_listing_api_call(request):
        """ Check whether api call is a request related to a listing

        :param request: api call
        :return: bool
        """
        m = re.match(r'/v2/listings/[0-9]+', request['url'])
        return m is not None

    @staticmethod
    def get_listing_id_from_url(url):
        """ Get listing id from URL, return empty string otherwise

        Function is used to get a sort key for sorting a requests array.
        :param url: Etsy API url from the request
        :return: listing id as string or empty string
        """
        m = re.match(r'/v2/listings/([0-9]+)', url)
        if m:
            return m.group(1)
        else:
            return ''

    @staticmethod
    def restart_emulator():
        """ Restarts Etsy emulator using external script
        """

        cmd = os.environ['QA_RESTART_ETSY']

        for _ in range(5):
            if call([cmd]) == 0:
                sleep(2)
                break
        else:
            raise EtsyEmulatorRestartError("Error: Etsy emulator restart failed (" + cmd + ")")

    def set_test_case(self, tc_name):
        """ Sets test case on Etsy emulator

        :param tc_name: name of the test case - JSON filename without the json extension
        """

        url = self.etsy_url + '/set_test_id?test_id=' + tc_name

        try:
            r = requests.get(url)
        except requests.exceptions.RequestException as e:
            raise EtsyEmulatorRequestError(str(e))

        if r.status_code != 200:
            error = 'Cannot set etsy test case on ' + url +\
                    '\n  Status code:' + str(r.status_code)
            if r.text:
                error += '\n  Response: ' + r.text
            raise EtsyEmulatorResponseError(error)

    def sort_api_calls(self, requests):
        """ Sort API calls to be comparable with test data

        VELA sends HTTP requests for different listings in random order - the order of listing requests is defined
        and important only per particular listing.

        Therefore we need to sort requests only according to listing number, which means:
        - DON'T sort non listing requests (i.e. shop request)
        - SORT only within group of listing requests (i.e. two groups separated by different requests)
        - DON'T sort requests with different url but same listing id (i.e. /v2/listings/1 and /v2/listings/1/xxx)
        - SORT requests with different listing ids (i.e. /v2/listings/1, /v2/listings/2/xxx, /v2/listings/3)

        :param requests: Array of api calls as returned by get_api_calls
        :return Array of api calls sorted as outlined above
        """

        result = []

        while requests:
            # skip sorting of non listing requests
            while requests and not self.is_listing_api_call(requests[0]):
                result.append(requests.pop(0))

            if requests:
                temp = []
                # sort group of listing requests according to their listing id only
                while requests and self.is_listing_api_call(requests[0]):
                    temp.append(requests.pop(0))
                result += sorted(temp, key=lambda i: self.get_listing_id_from_url(i['url']))

        return result

    def get_normalized_api_calls(self, sort=False, normalize_func=None):
        """ Return sorted and normalized requests sent to Etsy

        :param sort: whether to call sort function (bool) on requests data
        :param normalize_func: function to call for normalizing the requests data
        :return: sorted and normalized API calls array
        """

        data = self.get_api_calls()
        if sort:
            data = self.sort_api_calls(data)

        if normalize_func is not None:
            data = list(normalize_func(data))

        return data

    def validate_api_calls(self, expected_data, sort=False, normalize_func=None, message=''):
        """ Get API calls from the emulator, compare them with the expected data
        :param expected_data: API calls array
        :param sort: whether to call sort function (bool)
        :param normalize_func: function to call for normalizing the data
        :param message: error message when API calls are not successfully validated
        """

        data = self.get_normalized_api_calls(sort, normalize_func)

        try:
            assert data == expected_data, message
        except AssertionError:
            print('Expected data:', expected_data)
            print('Actual data: ', data)
            print_api_calls_diff(expected_data, data)
            raise
