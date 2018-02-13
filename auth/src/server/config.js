import config, { CryptoContent } from 'global/config';

require('!!raw!file?name=[name].[ext]!./config.json');
require('!!raw!file?name=[name]!../../../version');

export default(() => {
  const alterations = {
    'webUrl': process.env.HIVE_WEB_URL, // eslint-disable-line quote-props
    'httpPort': process.env.HIVE_HTTP_PORT, // eslint-disable-line quote-props

    'auth.scheme': process.env.HIVE_AUTH_SCHEME,
    'auth.host': process.env.HIVE_AUTH_HOST,
    'auth.port': process.env.HIVE_AUTH_PORT,

    'db.user': process.env.DB_USER,
    'db.password': process.env.DB_PASSWORD,
    'db.database': process.env.AUTH_DB_NAME,
    'db.logQueries': process.env.DB_LOG_QUERIES,
    'db.slowQueriesMinDuration': process.env.DB_SLOW_QUERIES_MIN_DURATION,

    'crypto.privateKey': process.env.HIVE_PRIVATE_KEY,
    'crypto.publicKey': process.env.HIVE_PUBLIC_KEY,
    'crypto.certificate': process.env.HIVE_CERTIFICATE,

    'session.cookieDomain': process.env.SESSION_COOKIE_DOMAIN,
    'session.store.dbConnectionString': process.env.SESSION_STORE_DB_CONNECTION_STRING,

    'mandrill.apikey': process.env.HIVE_AUTH_MANDRILL_APIKEY,

    'logging.loggly.token': process.env.LOGGLY_TOKEN,
    'logging.loggly.velaEnvironment': process.env.VELA_ENVIRONMENT,
    'logging.loggly.logLevel': process.env.LOGGLY_LOG_LEVEL
  };

  const resultCfg = config(alterations);

  resultCfg.authUrl = `${resultCfg.auth.scheme}://${resultCfg.auth.host}`;
  const standardPorts = {
    http: 80,
    https: 443
  };

  if (standardPorts[resultCfg.auth.scheme] !== resultCfg.auth.port) {
    resultCfg.authUrl += `:${resultCfg.auth.port}`;
  }

  resultCfg.cryptoContent = new CryptoContent(resultCfg.crypto);

  return resultCfg;
})();
