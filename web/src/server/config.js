import config, { CryptoContent } from 'global/config';

export default (() => {
  const alterations = {
    'httpPort': process.env.HIVE_HTTP_PORT, // eslint-disable-line quote-props

    'loginPage': process.env.HIVE_LOGIN_PAGE, // eslint-disable-line quote-props
    'logoutPage': process.env.HIVE_LOGOUT_PAGE, // eslint-disable-line quote-props

    'customSignupPage': process.env.HIVE_SIGNUP_PAGE, // eslint-disable-line quote-props

    'db.db1.user': process.env.DB_USER,
    'db.db1.password': process.env.DB_PASSWORD,
    'db.db1.database': process.env.DB_NAME,
    'db.db1.logQueries': process.env.DB_LOG_QUERIES,
    'db.db1.slowQueriesMinDuration': process.env.DB_SLOW_QUERIES_MIN_DURATION,

    'crypto.privateKey': process.env.HIVE_PRIVATE_KEY,
    'crypto.publicKey': process.env.HIVE_PUBLIC_KEY,
    'crypto.certificate': process.env.HIVE_CERTIFICATE,

    'session.cookieDomain': process.env.SESSION_COOKIE_DOMAIN,
    'session.store.dbConnectionString': process.env.SESSION_STORE_DB_CONNECTION_STRING,

    'serverScheme': process.env.SERVER_SCHEME, // eslint-disable-line quote-props
    'serverDomain': process.env.SERVER_DOMAIN, // eslint-disable-line quote-props
    'serverPort': parseInt(process.env.PORT, 10), // eslint-disable-line quote-props

    'rabbitmq.uri': process.env.RABBIT_URI,

    'etsy.auth.consumerKey': process.env.ETSY_KEY,
    'etsy.auth.consumerSecret': process.env.ETSY_SECRET,
    'etsy.auth.requestTokenURL': process.env.ETSY_REQUEST_TOKEN_URL,
    'etsy.auth.accessTokenURL': process.env.ETSY_ACCESS_TOKEN_URL,
    'etsy.auth.userAuthorizationURL': process.env.ETSY_USER_AUTHORIZATION_URL,
    'etsy.apiUrl': process.env.ETSY_API_URL,

    'shopify.auth.apiKey': process.env.SHOPIFY_API_KEY,
    'shopify.auth.apiSecretKey': process.env.SHOPIFY_API_SECRET_KEY,
    'shopify.auth.accessTokenURL': process.env.SHOPIFY_ACCESS_TOKEN_URL,
    'shopify.auth.userAuthorizationURL': process.env.SHOPIFY_USER_AUTHORIZATION_URL,
    'shopify.apiUrl': process.env.SHOPIFY_API_URL,

    'intercom.secureModeSecretKey': process.env.HIVE_INTERCOM_SECURE_MODE_SECRET_KEY,

    'logging.loggly.token': process.env.LOGGLY_TOKEN,
    'logging.loggly.velaEnvironment': process.env.VELA_ENVIRONMENT,
    'logging.loggly.logLevel': process.env.LOGGLY_LOG_LEVEL,

    'syncUpdatesBatchSize': process.env.SYNC_UPDATES_BATCH_SIZE, // eslint-disable-line quote-props

    'AWS.images.region': process.env.AWS_IMAGES_REGION,
    'AWS.images.bucketName': process.env.AWS_IMAGES_BUCKET_NAME,
    'AWS.images.accessKeyId': process.env.AWS_IMAGES_ACCESS_KEY_ID,
    'AWS.images.secretAccessKey': process.env.AWS_IMAGES_SECRET_KEY
  };

  const resultCfg = config(alterations);

  resultCfg.signupPage = resultCfg.customSignupPage || resultCfg.loginPage + '?signup';

  resultCfg.webUrl = `${resultCfg.serverScheme}://${resultCfg.serverDomain}`;
  const standardPorts = {
    http: 80,
    https: 443
  };

  if (standardPorts[resultCfg.serverScheme] !== resultCfg.serverPort) {
    resultCfg.webUrl += `:${resultCfg.serverPort}`;
  }

  resultCfg.cryptoContent = new CryptoContent(resultCfg.crypto);

  return resultCfg;
})();
