from math import ceil
from typing import List, Dict
import requests


class ShopifyAPI(object):
    """ Generic class for communication with Shopify API
    """
    URL_PRODUCTS = '/admin/products.json'
    URL_PRODUCTS_COUNT = '/admin/products/count.json'
    URL_PRODUCT = '/admin/products/{id}.json'
    PAGE_LIMIT = 250

    def __init__(self, shop_domain: str, token: str):
        self._shop_url = 'https://' + shop_domain
        self._headers = {'X-Shopify-Access-Token': token}

    def _delete(self, url):
        response = requests.delete(self._shop_url + url, headers=self._headers)
        response.raise_for_status()
        return response.json()

    def _get(self, url, params=None):
        response = requests.get(self._shop_url + url, headers=self._headers, params=params)
        response.raise_for_status()
        return response.json()

    def _post(self, url, data):
        response = requests.post(self._shop_url + url, headers=self._headers, json=data)
        response.raise_for_status()
        return response.json()

    def _put(self, url, data):
        response = requests.put(self._shop_url + url, headers=self._headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_products_count(self) -> int:
        """ Get number of products in the shop

        :return: Total number of products in the shop
        """
        data_dict = self._get(self.URL_PRODUCTS_COUNT)
        return data_dict['count']

    def get_products(self, fields: str='') -> List[Dict]:
        """ Get all products from the shop

        :param fields: Which fields of the product should be included, i.e. 'id,title'
        :return: List of products
        """
        products = []
        products_count = self.get_products_count()
        params = {'limit': self.PAGE_LIMIT}
        if fields:
            params['fields'] = fields

        pages_count = ceil(products_count / self.PAGE_LIMIT)
        for page_num in range(1, pages_count + 1):
            params['page'] = page_num
            products += self._get(self.URL_PRODUCTS, params=params)['products']

        return products

    def create_product(self, data: Dict) -> Dict:
        """ Create new product in the shop

        :param data: Data to be set on the product
        :return: Newly created product
        """
        data = dict(product=data)
        return self._post(self.URL_PRODUCTS, data)['product']

    def change_product(self, product_id: int, change_data: Dict) -> Dict:
        """ Change product in the shop

        :param product_id: ID of the product
        :param change_data: Data to be changed on the product
        :return: Newly created product
        """
        change_data = dict(product=change_data)
        change_data['product']['id'] = product_id
        return self._put(self.URL_PRODUCT.format(id=product_id), change_data)['product']

    def change_title(self, product_id: int, new_title: str) -> Dict:
        """ Change title of the product in the shop

        :param product_id: ID of the product
        :param new_title: New title of the product
        :return: Data of the changed product
        """
        data = dict(title=new_title)
        return self.change_product(product_id, data)

    def delete_product(self, product_id: int):
        """ Delete a product from the shop

        :param product_id: ID of the product to be deleted
        """
        self._delete(self.URL_PRODUCT.format(id=product_id))
