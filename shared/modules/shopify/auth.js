import _ from 'lodash';
import { AUTH } from '../../constants';
import { OAuth2 } from 'oauth';
import { URL } from 'url';

export default class ShopifyAuth {
  constructor(config) {
    this._config = config;

    this.provider = 'shopify';
    this.type = AUTH.SHOPIFY_OAUTH_2;

    this.serverUrl = config.serverScheme + '://' + config.serverDomain + (config.serverPort ? (':' + config.serverPort) : '');
  }

  getConfigValue(property) {
    return _.get(this, ['_config', 'shopify', 'auth', property], null);
  }

  createOAuth = (shopDomain) => {
    const apiKey = this.getConfigValue('apiKey');
    const secretKey = this.getConfigValue('apiSecretKey');
    const userAuthorizationURL = this.getConfigValue('userAuthorizationURL');
    const accessTokenURL = this.getConfigValue('accessTokenURL');

    return new OAuth2(apiKey, secretKey, `https://${shopDomain}`, userAuthorizationURL, accessTokenURL, null);
  }

  authStartHandler = () => {
    return (req, res) => {
      const { shopAdminUrl } = req.query;
      const url = new URL(shopAdminUrl);

      const oauth2 = this.createOAuth(url.host);

      const oauthParams = {
        scope: ['read_products', 'write_products', 'read_product_listings', 'read_collection_listings'].join(','),
        redirect_uri: `${this.serverUrl}${this._config.auth.prefix}/${this.provider}/callback`
      };

      const redirectUrl = oauth2.getAuthorizeUrl(oauthParams);

      res.redirect(redirectUrl);
    };
  }

  authCallbackHandler = () => {
    return (req, res) => {
      const { shop } = req.query;

      const oauth2 = this.createOAuth(shop);

      oauth2.getOAuthAccessToken(req.query.code, null, async (error, accessToken) => {
        if (error) { throw error; }

        await this.authenticated(req.session, { token: accessToken, tokenSecret: null, domain: shop });
        res.redirect('/');
      });
    };
  }
}
