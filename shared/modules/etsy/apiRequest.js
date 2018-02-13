import Promise from 'bluebird';
import request from 'superagent';
import {OAuth} from 'oauth';
import superagentOauth from 'superagent-oauth';


export default class ApiRequest {
  constructor(config) {
    superagentOauth(request);
    this._apiUrl = config.etsy.apiUrl;
    this._oauth = new OAuth('', '', // don't need token URLs here
      config.etsy.auth.consumerKey,
      config.etsy.auth.consumerSecret,
      '1.0A', null, 'HMAC-SHA1'
    );
  }

  get(token, secret, uri) {
    return new Promise((resolve, reject) => {
      request.get(`${this._apiUrl}${uri}`)
        .sign(this._oauth, token, secret)
        .end((error, response) => {
          if (error) {
            reject(error);
          } else if (!response || !response.body) {
            reject(new Error('Empty response'));
          } else {
            resolve(response && response.body, response);
          }
        });
    });
  }
}
