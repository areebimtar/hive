from requests_oauthlib import OAuth1Session
import base64
from urllib.parse import quote

VERIFY_CERT = True

ETSY_API_URL = 'https://openapi.etsy.com/v2'


def get_oauth_session(credentials, **kwargs):
    return OAuth1Session(client_key=credentials['CLIENT_KEY'],
                         client_secret=credentials['CLIENT_SECRET'],
                         resource_owner_key=credentials['AUTHORIZED_OAUTH_TOKEN'],
                         resource_owner_secret=credentials['AUTHORIZED_OAUTH_TOKEN_SECRET'],
                         **kwargs)


def get_protected_resource(oauth_session, protected_url):
    return oauth_session.get(protected_url, verify=VERIFY_CERT)


def delete_protected_resource(oauth_session, protected_url):
    return oauth_session.delete(protected_url, verify=VERIFY_CERT)


# TODO This seems to me like etsy specific formatting function - doesn't work - should be handled elsewhere anyway
def format_payload(data, url):
    body = {}
    url_arays = {}

    for i in data.keys():
        if type(data[i]) is list:
            url_arays[i] = data[i]
        else:
            if i[:7] == 'base64:':
                key = i[7:]
                binary = base64.b64decode(data[i])
                body[key] = binary
            else:
                body[i] = (None, data[i])

    url_query = ''
    if len(url_arays) > 0:
        for i in url_arays.keys():
            if url_query != '':
                url_query += '&'
            url_query += quote(i) + '='
            url_query += ','.join([quote(str(u)) for u in url_arays[i]])

    final_url = url if url_query == '' else url + '?' + url_query
    return final_url, body


def put_protected_resource(oauth_session, url, data):
    return oauth_session.put(url, data=data, verify=VERIFY_CERT)


def post_protected_resource(oauth_session, url, data):
    return oauth_session.post(url, data=data, verify=VERIFY_CERT)
