import _ from 'lodash';
import moment from 'moment';
import colors from 'colors'; // TODO: unable to use colors/safe because of bug in webpack, sorry ;)
import winston from 'winston';
import 'winston-loggly-bulk';
import os from 'os';

colors.setTheme({
  info: 'green',
  error: 'red', // TODO: for some reason ['red', 'bold'] does not work
  debug: 'gray'
});

const formatter = (options) => {
  // Return string will be passed to logger.
  const color = colors[options.level];
  return [
    colors.gray(options.timestamp()),
    color(options.level.toUpperCase()),
    color('==>'),
    color((undefined !== options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' ))
  ].join(' ');
};

const timestamp = () => {
  return moment().format();
};

function createLogglyTransport(logglyConfig) {
  // The configuration of Loggly tags allow us to filter the combined logs on loggly
  //     - serverType is one of auth, web, worker, maanager
  //     - velaEnvironment is something like production, staging, qa or unspecified (default)
  //     - hostname lets us identify a particular server when there are more than one per type (e.g. from which host the actual worker instance in production logged a message)
  //     - workerId (per host unique worker id)
  const tags = [logglyConfig.serverType, logglyConfig.velaEnvironment, os.hostname()];
  if (logglyConfig.workerId) {
    tags.push(logglyConfig.workerId);
  }
  return new winston.transports.Loggly({
    token: logglyConfig.token,
    subdomain: 'getvela', // this is the subdomain of our Loggly account and not related to the vela hostname
    level: logglyConfig.logLevel,
    tags: tags,
    json: true
  });
}

export class Logger extends winston.Logger {
  constructor(config) {
    const consoleLogLevel = _.get(config, 'consoleLevel', 'info');
    const transports = [new (winston.transports.Console)({ level: consoleLogLevel, timestamp, formatter })];

    // only set up loggly logging when a loggly token is supplied in the config, by default none is included and we don't
    // log to loggly.
    if (_.get(config, 'loggly.token')) {
      transports.push(createLogglyTransport(config.loggly));
    }

    // log unhandled exceptions
    winston.handleExceptions(transports);

    super({ transports: transports });
  }
}
