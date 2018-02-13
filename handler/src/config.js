import config from 'global/config';

export default (() => {
  const alterations = {
    'db.user': process.env.DB_USER,
    'db.password': process.env.DB_PASSWORD,
    'db.logQueries': process.env.DB_LOG_QUERIES,
    'db.slowQueriesMinDuration': process.env.DB_SLOW_QUERIES_MIN_DURATION,
    'db.database': process.env.DB_NAME,

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

    'logging.loggly.token': process.env.LOGGLY_TOKEN,
    'logging.loggly.velaEnvironment': process.env.VELA_ENVIRONMENT,
    'logging.loggly.logLevel': process.env.LOGGLY_LOG_LEVEL,

    'rabbitmq.uri': process.env.RABBIT_URI,

    'AWS.images.region': process.env.AWS_IMAGES_REGION,
    'AWS.images.bucketName': process.env.AWS_IMAGES_BUCKET_NAME,
    'AWS.images.accessKeyId': process.env.AWS_IMAGES_ACCESS_KEY_ID,
    'AWS.images.secretAccessKey': process.env.AWS_IMAGES_SECRET_KEY
  };

  return config(alterations);
})();
