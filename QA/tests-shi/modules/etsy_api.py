from modules import oauth as oauth
from modules.http import format_http_response


class EtsyAPI(object):
    LISTINGS_LIMIT = 100  # 100 is maximum, Etsy won't return more listings in one request

    def __init__(self, credentials):
        self.credentials = credentials
        self.shipping_template_id = None
        self.shop_id = None

    def get_shipping_template_id(self):
        if not self.shipping_template_id:
            session = oauth.get_oauth_session(self.credentials)
            url = oauth.ETSY_API_URL + '/users/__SELF__/shipping/templates'
            response = oauth.get_protected_resource(session, url)
            assert response.status_code == 200, format_http_response(response)
            j = response.json()
            assert len(j['results']) > 0
            self.shipping_template_id = j['results'][0]['shipping_template_id']
        return self.shipping_template_id

    def get_shop_id(self):
        if not self.shop_id:
            session = oauth.get_oauth_session(self.credentials)
            url = oauth.ETSY_API_URL + '/users/__SELF__/shops'
            response = oauth.get_protected_resource(session, url)
            assert response.status_code == 200, format_http_response(response)
            j = response.json()
            assert len(j['results']) > 0
            self.shop_id = str(j['results'][0]['shop_id'])
        return self.shop_id

    def create_listing(self, data):
        session = oauth.get_oauth_session(self.credentials, signature_type='body')
        url = oauth.ETSY_API_URL + '/listings'
        response = oauth.post_protected_resource(session, url, data)
        assert response.status_code == 201, format_http_response(response)
        print('created listing %s' % data['title'])

    def get_listings(self, status='draft', fields='title,listing_id'):
        session = oauth.get_oauth_session(self.credentials)
        shop_id = self.get_shop_id()

        def _get_listings_page(_offset=0):
            url = oauth.ETSY_API_URL + '/shops/' + shop_id + '/listings/' + status + '?fields=' + fields +\
                  '&limit=%d' % self.LISTINGS_LIMIT
            if _offset:
                url += '&offset=%d' % _offset
            _response = oauth.get_protected_resource(session, url)
            assert _response.status_code == 200, format_http_response(_response)
            return _response

        i = 0
        offset = 0
        total_count = 1  # dummy value
        listings = []
        while (len(listings) < total_count) and (i < 20):  # i is there to prevent infinite loop
            response = _get_listings_page(offset)
            j = response.json()
            total_count = j['count']
            listings += j['results']
            offset = len(listings)
            i += 1

        assert len(listings) == total_count, 'Unable to get all listings'
        return listings

    @staticmethod
    def filter_listings(listings, prefix):
        for l in listings:
            if l['title'].startswith(prefix):
                yield l

    def remove_listings(self, prefix):
        session = oauth.get_oauth_session(self.credentials)
        for listing in self.filter_listings(self.get_listings(), prefix):
            url = oauth.ETSY_API_URL + '/listings/' + str(listing['listing_id'])
            print('removing listing', listing['listing_id'])
            response = oauth.delete_protected_resource(session, url)
            assert response.status_code == 200, format_http_response(response)

    def get_listing_detail(self, listing_id, includes='?includes=User,Shop,Section,Images,MainImage,Translations,Manufacturers,Inventory,Attributes&language=en'):
        session = oauth.get_oauth_session(self.credentials)
        url = oauth.ETSY_API_URL + '/listings/' + str(listing_id) + includes
        response = oauth.get_protected_resource(session, url)
        assert response.status_code == 200, format_http_response(response)
        j = response.json()
        return j['results'][0]

    def get_sections(self):
        session = oauth.get_oauth_session(self.credentials)
        shop_id = self.get_shop_id()
        url = oauth.ETSY_API_URL + '/shops/' + shop_id + '/sections'
        response = oauth.get_protected_resource(session, url)
        assert response.status_code == 200, format_http_response(response)
        j = response.json()
        return j['results']

    def change_listing_title(self, listing_id, listing_state, new_title):
        session = oauth.get_oauth_session(self.credentials)
        url = oauth.ETSY_API_URL + '/listings/' + str(listing_id)
        data = {
            'listing_id': int(listing_id),
            'state': listing_state.lower(),
            'title': new_title
        }
        response = oauth.put_protected_resource(session, url, data)
        assert response.status_code == 200, format_http_response(response)
        j = response.json()
        return j['results'][0]
