#!/usr/bin/env python2
from requests_oauthlib import OAuth1Session
from urllib.parse import urlparse, parse_qs
import requests
import sys


# Uncomment for detailed oauthlib logs
#   import logging
#   import sys
#   log = logging.getLogger('oauthlib')
#   log.addHandler(logging.StreamHandler(sys.stdout))
#   log.setLevel(logging.DEBUG)

ETSY_REQUEST_TOKEN_URL = 'http://service-test:3000/v2/oauth/request_token'
ETSY_ACCES_TOKEN_URL = 'http://service-test:3000/v2/oauth/access_token'
ETSY_CLIENT_KEY = 'TestClientApp1'
ETSY_CLIENT_SECRET = 'TestClientApp1-Secret'
CALLBACK_URI='http://127.0.0.1/callback'

AUTHORIZED_OAUTH_TOKEN = 'MyAccesToken1'
AUTHORIZED_OAUTH_TOKEN_SECRET = 'MyAccessTokenSecret1'
ETSY_API_URL = 'http://service-test:3000/v2'

def get_access_token(client_key, client_secret, request_token_url, access_token_url, callback_uri):
        # get request token (temporary resource_owner_key/secret)
    oauth = OAuth1Session(client_key=client_key, client_secret=client_secret, callback_uri=callback_uri)
    fetch_response = oauth.fetch_request_token(request_token_url)
    resource_owner_key = fetch_response.get('oauth_token')
    resource_owner_secret = fetch_response.get('oauth_token_secret')
    auth_url = fetch_response['login_url']
    print('tmp owner key:', resource_owner_key)
    print('tmp owner sec:', resource_owner_secret)


        # get authorization, insert the verifier key
    #print('Go to this URL and get the key:', auth_url)
    #verifier = input('enter the verifier:')

    with requests.Session() as s:
        print('\nVisiting URL to get a verifier key:', auth_url)
        r = s.get(auth_url, allow_redirects=False)
        if (r.status_code == 302) and ('location' in r.headers):
            params = parse_qs(urlparse(r.headers['location']).query)
            verifier = params['oauth_verifier'][0]
            print('verifier =', verifier)

        else:
            print("Error: Redirect expected, got", r.status_code, r.headers, r.text)
            exit(1)


        # Obtain an access token from the OAuth provider
    oauth = OAuth1Session(client_key = client_key,
                          client_secret = client_secret,
                          resource_owner_key = resource_owner_key,
                          resource_owner_secret = resource_owner_secret,
                          verifier = verifier)
    oauth_tokens = oauth.fetch_access_token(access_token_url)
    access_token = oauth_tokens.get('oauth_token')
    access_token_secret = oauth_tokens.get('oauth_token_secret')
    return access_token, access_token_secret


def get_protected_resource(protected_url):
    oauth = OAuth1Session(client_key = ETSY_CLIENT_KEY,
                          client_secret = ETSY_CLIENT_SECRET,
                          resource_owner_key = AUTHORIZED_OAUTH_TOKEN,
                          resource_owner_secret = AUTHORIZED_OAUTH_TOKEN_SECRET)
    return oauth.get(protected_url)

if (len(sys.argv) > 1) and (sys.argv[1] == '--resource'):
    resource = ETSY_API_URL + (sys.argv[2] if len(sys.argv) > 2 else '/shops/EtsyTestAppShop/listings/draft')
    r = get_protected_resource(resource)
    print(r)
    print(r.text)
else:
    access_token, access_token_secret = get_access_token(ETSY_CLIENT_KEY, ETSY_CLIENT_SECRET, ETSY_REQUEST_TOKEN_URL, ETSY_ACCES_TOKEN_URL, CALLBACK_URI)
    print('access_token =', access_token)
    print('access_token_secret =', access_token_secret)



