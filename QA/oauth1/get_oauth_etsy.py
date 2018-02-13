#!/usr/bin/env python3
from requests_oauthlib import OAuth1Session
from urllib.parse import urlparse, parse_qs, urlencode, quote
import requests
import os, sys
from pprint import pprint
import json
import argparse
import base64

VERIFY_CERT = True

# Uncomment for detailed oauthlib logs
#   import logging
#   import sys
#   log = logging.getLogger('oauthlib')
#   log.addHandler(logging.StreamHandler(sys.stdout))
#   log.setLevel(logging.DEBUG)

ETSY_REQUEST_TOKEN_URL = 'https://openapi.etsy.com/v2/oauth/request_token'
ETSY_ACCES_TOKEN_URL = 'https://openapi.etsy.com/v2/oauth/access_token'
#ETSY_CLIENT_KEY = 'whv9ifuh8y6mbozy8ggitiac'
#ETSY_CLIENT_SECRET = 'czh00o2hb6'
CALLBACK_URI='http://127.0.0.1/callback'

#AUTHORIZED_OAUTH_TOKEN = '29f757b6aaf1e2c53e9eca37066e2b'
#AUTHORIZED_OAUTH_TOKEN_SECRET = '252c2992a2'
ETSY_API_URL = 'https://openapi.etsy.com/v2'

def get_access_token(client_key, client_secret, request_token_url, access_token_url, callback_uri):
        # get request token (temporary resource_owner_key/secret)
    oauth = OAuth1Session(client_key=client_key, client_secret=client_secret)
    #oauth = OAuth1Session(client_key=client_key, client_secret=client_secret, callback_uri=callback_uri)
    fetch_response = oauth.fetch_request_token(request_token_url)
    resource_owner_key = fetch_response.get('oauth_token')
    resource_owner_secret = fetch_response.get('oauth_token_secret')
    auth_url = fetch_response['login_url']
    print('response =', fetch_response)
    print('tmp owner key:', resource_owner_key)
    print('tmp owner sec:', resource_owner_secret)

        # RETURNED RESPONSE:
        #    Cache-Control: private
        #    Date: Tue, 17 Nov 2015 10:57:44 GMT
        #    Connection: keep-alive
        #    Content-Length: 364
        #    X-Etsy-Request-Uuid: l0BAkRk2y7jeXkqYwdT1MH8ifRWU
        #    Content-Type: application/x-www-form-urlencoded
        #    Server: Apache
        #    X-Cnection: close
        #
        #  login_url=https%3A%2F%2Fwww.etsy.com%2Foauth%2Fsignin%3Foauth_consumer_key%3Dwhv9ifuh8y6mbozy8ggitiac%26oauth_token%3D9e69f73f12f8a9148cdec4ca7a8c6c%26service%3Dv2_prod&oauth_token=9e69f73f12f8a9148cdec4ca7a8c6c&oauth_token_secret=bce8a21bb1&oauth_callback_confirmed=true&oauth_consumer_key=whv9ifuh8y6mbozy8ggitiac&oauth_callback=http%3A%2F%2F127.0.0.1%2Fcallback
        # DECODED:
        #                                                                          (client-app key)                        (tmp owner key)
        #    login_url=https://www.etsy.com/oauth/signin?oauth_consumer_key=whv9ifuh8y6mbozy8ggitiac&oauth_token=9e69f73f12f8a9148cdec4ca7a8c6c&service=v2_prod
        #
        #    oauth_token=9e69f73f12f8a9148cdec4ca7a8c6c     // tmp owner key
        #    oauth_token_secret=bce8a21bb1                  // tmp owner secret
        #    oauth_callback_confirmed=true
        #    oauth_consumer_key=whv9ifuh8y6mbozy8ggitiac    // client-app key (application hive)
        #    oauth_callback=http://127.0.0.1/callback

        # get authorization, insert the verifier key
    print('Go to this URL and get the key:', auth_url)
    verifier = input('enter the verifier:')


        # ETSY returns CALLBACK redirect (HTTP:302 Location:xxx)
        #   HTTP/1.1 302 Found
        #   Cache-Control: private, no-store, no-cache, must-revalidate, post-check=0, pre-check=0
        #   Content-Type: text/html; charset=UTF-8
        #   Date: Tue, 17 Nov 2015 15:14:48 GMT
        #   Expires: Thu, 19 Nov 1981 08:52:00 GMT
                    #     (my callback URL)                    (tmp owner key)                  (verifier 9faf70a7)
        #   Location: http://127.0.0.1/callback?oauth_token=9e69f73f12f8a9148cdec4ca7a8c6c&oauth_verifier=9faf70a7#_=_
        #   Server: Apache
        #   Set-Cookie: uaid=uaid%3DzYJO0qNUJxUC0ql_C6IPCkCCIa55%26_now%3D1447773288%26_slt%3DTSZwl-vt%26_kid%3D1%26_ver%3D1%26_mac%3D3wBW15GxuEumOJESnbx9-pG49VminC_niynI_EralJY.; expires=Sat, 17-Dec-2016 07:33:08 GMT; Max-Age=34186700; path=/; domain=.etsy.com; httponly
        #   Set-Cookie: fve=1446888352.0; expires=Sat, 17-Dec-2016 07:33:08 GMT; Max-Age=34186700; path=/; domain=.etsy.com
        #   Strict-Transport-Security: max-age=631138520; includeSubDomains; preload
        #   X-Cnection: close
        #   X-Content-Type-Options: nosniff
        #   X-Frame-Options: SAMEORIGIN
        #   X-Recruiting: Is code your craft? https://www.etsy.com/careers
        #   X-XSS-Protection: 1; mode=block; report=/beacon/csp.php
        #   Content-Length: 0
        #   ----------------------------------------------------------


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
    return oauth.get(protected_url, verify=VERIFY_CERT)

def delete_protected_resource(protected_url):
    oauth = OAuth1Session(client_key = ETSY_CLIENT_KEY,
                          client_secret = ETSY_CLIENT_SECRET,
                          resource_owner_key = AUTHORIZED_OAUTH_TOKEN,
                          resource_owner_secret = AUTHORIZED_OAUTH_TOKEN_SECRET)
    return oauth.delete(protected_url, verify=VERIFY_CERT)


def put_protected_resource(protected_url, raw_data):
    data = json.loads(raw_data)

    body = {}
    url_arays = {}
        
    for i in data.keys():
        if type(data[i]) is list:
            url_arays[i] = data[i]
        else:
            body[i] = data[i]
 
 
    oauth = OAuth1Session(client_key = ETSY_CLIENT_KEY,
                          client_secret = ETSY_CLIENT_SECRET,
                          resource_owner_key = AUTHORIZED_OAUTH_TOKEN,
                          resource_owner_secret = AUTHORIZED_OAUTH_TOKEN_SECRET,
                          signature_type='body')

    if len(url_arays) > 0:
        final_url = ''
        for i in url_arays.keys():
            if final_url == '':
                final_url += protected_url + '?'
            else:
                final_url += '&'
            final_url += quote(i) + '='
            final_url += ','.join([quote(u) for u in url_arays[i]])
    else:
        final_url = protected_url
    #final_url = protected_url + '?' + 'tags=foo,bar,baz'
    return oauth.put(final_url, data=body, verify=VERIFY_CERT)


def post_protected_resource(protected_url, raw_data):
    data = json.loads(raw_data)

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
 
 
    oauth = OAuth1Session(client_key = ETSY_CLIENT_KEY,
                          client_secret = ETSY_CLIENT_SECRET,
                          resource_owner_key = AUTHORIZED_OAUTH_TOKEN,
                          resource_owner_secret = AUTHORIZED_OAUTH_TOKEN_SECRET
                          )

    if len(url_arays) > 0:
        final_url = ''
        for i in url_arays.keys():
            if final_url == '':
                final_url += protected_url + '?'
            else:
                final_url += '&'
            final_url += quote(i) + '='
            final_url += ','.join([quote(str(u)) for u in url_arays[i]])
    else:
        final_url = protected_url
    #final_url = protected_url + '?' + 'tags=foo,bar,baz'
    return oauth.post(final_url, files=body, verify=VERIFY_CERT)




parser = argparse.ArgumentParser()
parser.add_argument("--resource", default = '/shops/EtsyTestAppShop/listings/draft')
parser.add_argument("--method", default = 'get')
parser.add_argument("--data")
parser.add_argument("--authorize", action="store_true")
parser.add_argument("--user-token")
parser.add_argument("--user-secret")
parser.add_argument("--client-token", required=True)
parser.add_argument("--client-secret", required=True)

args = parser.parse_args()

ETSY_CLIENT_KEY = args.client_token
ETSY_CLIENT_SECRET = args.client_secret

# hack - do not verify certs
if 'NODE_TLS_REJECT_UNAUTHORIZED' in os.environ and os.environ['NODE_TLS_REJECT_UNAUTHORIZED'] == '0':
    VERIFY_CERT = False

if args.authorize:
        # authorize user, create new tokens
    access_token, access_token_secret = get_access_token(ETSY_CLIENT_KEY, ETSY_CLIENT_SECRET, ETSY_REQUEST_TOKEN_URL, ETSY_ACCES_TOKEN_URL, CALLBACK_URI)
    print('access_token =', access_token)
    print('access_token_secret =', access_token_secret)

else:
    if args.user_token == None:
        print("Error: --user-token argument expected")
        exit(1)
    AUTHORIZED_OAUTH_TOKEN = args.user_token
    if args.user_secret == None:
        print("Error: --user-secret argument expected")
        exit(1)
    AUTHORIZED_OAUTH_TOKEN_SECRET = args.user_secret

        # get/put.. resource
    if args.resource[0:4] == '/v2/':
        args.resource = args.resource[3:]

    if args.method == 'get':
        r = get_protected_resource(ETSY_API_URL + args.resource)

    elif args.method == 'put':
        if args.data == None:
            print("Error: --data DATA argument expected")
            exit(1)
        #data = {"description": "Ahoj :-)", "materials": ["air"], "last_modified_tsz": "1458033722", "title": "My Modified Listing", "state": "draft"}
        r = put_protected_resource(ETSY_API_URL + args.resource, args.data)

    elif args.method == 'post':
        if args.data == None:
            print("Error: --data DATA argument expected")
            exit(1)
        #data = {"description": "Ahoj :-)", "materials": ["air"], "last_modified_tsz": "1458033722", "title": "My Modified Listing", "state": "draft"}
        r = post_protected_resource(ETSY_API_URL + args.resource, args.data)

    elif args.method == 'delete':
        r = delete_protected_resource(ETSY_API_URL + args.resource)
    else:
        print("Error: unsupported method ", args.method)
        exit(1)

    #pprint(vars(r))
    print("\tStatus-code:\t" + str(r.status_code) + "\n", file=sys.stderr)
    for n, v in r.headers.items():
        print("\t" + n + "\t" + v, file=sys.stderr)
    print("", file=sys.stderr)
    print(r.text)


