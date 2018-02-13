import OAuth1 from '../auth/oauth1';

export default class EtsyAuth extends OAuth1 {
  constructor(config) {
    let callbackUrl = config.serverScheme + '://' + config.serverDomain;
    if (config.serverPort) {
      callbackUrl += ':' + config.serverPort;
    }

    callbackUrl += config.auth.prefix + '/etsy/callback';

    const oauthOptions = {
      requestTokenURL: config.etsy.auth.requestTokenURL, // 'https://openapi.etsy.com/v2/oauth/request_token',
      accessTokenURL: config.etsy.auth.accessTokenURL, // 'https://openapi.etsy.com/v2/oauth/access_token',
      userAuthorizationURL: config.etsy.auth.userAuthorizationURL, // 'https://www.etsy.com/oauth/signin',
      consumerKey: config.etsy.auth.consumerKey,
      consumerSecret: config.etsy.auth.consumerSecret,
      callbackURL: callbackUrl
    };

    super('etsy', oauthOptions);
  }

  authStartHandler = () => this.authenticate({session: false});
  authCallbackHandler = () => this.authenticate({session: false, failureRedirect: '/fail.html', successRedirect: '/'});
}
