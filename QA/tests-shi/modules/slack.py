from requests_oauthlib import OAuth2Session

URL = 'https://slack.com/api/chat.postMessage'
SCOPE = "identify,chat:write:bot"
USER_NAME = 'QA'


class SlackError(Exception):
    pass


class SlackClient(object):
    def __init__(self, client_key, access_token):
        self.client_key = client_key
        self.access_token = access_token

    def send_message(self, channel, message):
        oauth = OAuth2Session(self.client_key, token={'access_token': 'x', 'token_type': 'Bearer'}, scope=SCOPE)
        resp = oauth.post(url=URL,
                          data={"token": self.access_token, "channel": channel, "text": message, "username": USER_NAME})

        if resp.status_code == 200:
            if resp.json()['ok'] is True:
                return

        error = 'Failed to send message to Slack: %d, %s' % (resp.status_code, resp.text)
        raise SlackError(error)
