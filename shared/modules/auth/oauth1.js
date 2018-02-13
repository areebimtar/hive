import {AUTH} from '../../constants';
import passport from 'passport';
import {OAuthStrategy} from 'passport-oauth';

export default class OAuth1 {
  constructor(provider, opts) {
    const verifyCallback = (request, token, tokenSecret, profile, done) => {
      this.authenticated(request.session, { token, tokenSecret })
        .then(() => done(null, true))
        .catch((error) => done(error, false));
    };

    const options = Object.assign({}, opts || {}, { passReqToCallback: true });

    const strategy = new OAuthStrategy(options, verifyCallback.bind(this));
    passport.use(provider, strategy);

    this.provider = provider;
    this.type = AUTH.OAUTH_1;
  }

  authenticate(options) {
    return passport.authenticate(this.provider, options);
  }

  authenticated(user, token, tokenSecret) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented');
  }

}
