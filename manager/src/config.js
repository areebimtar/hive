import config from 'global/config';

require('!!raw!file?name=[name].[ext]!./config.json');
require('!!raw!file?name=[name]!../../version');

export default (() => {
  const alterations = {
    'serverPort': process.env.HIVE_MANAGER_PORT, // eslint-disable-line quote-props
    'manager.APIPort': process.env.HIVE_MANAGER_API_PORT,
    'db.user': process.env.DB_USER,
    'db.password': process.env.DB_PASSWORD,
    'db.logQueries': process.env.DB_LOG_QUERIES,
    'db.slowQueriesMinDuration': process.env.DB_SLOW_QUERIES_MIN_DURATION,
    'db.database': process.env.DB_NAME,

    'logging.loggly.token': process.env.LOGGLY_TOKEN,
    'logging.loggly.velaEnvironment': process.env.VELA_ENVIRONMENT,
    'logging.loggly.logLevel': process.env.LOGGLY_LOG_LEVEL,
    'rabbitmq.uri': process.env.RABBIT_URI
  };
  return config(alterations, 'manager');
})();
