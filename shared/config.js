import * as fs from 'fs';
import _ from 'lodash';
import { dirname } from 'path';

function alter(object, property, value) {
  const keys = property.split('.');
  const last = keys.pop();
  let target = object;
  keys.forEach((key) => {
    target[key] = target[key] || {};
    target = target[key];
  });
  target[last] = value || target[last];
  return object;
}

function getArg(argName) {
  const configArg = _.find(process.argv, arg => _.startsWith(arg, `--${argName}`));
  return configArg ? configArg.split('=').pop() : null;
}

export default (alterations) => {
  const cmdConfig = getArg('config');
  const cmdVersion = getArg('version');
  const cwd = dirname(process.argv[1]);

  const configPath = process.env.HIVE_CONFIG || cmdConfig || `${cwd}/config.json`;
  const versionPath = process.VERSION || cmdVersion || `${cwd}/version`;

  const environment = {
    development: {
      isProduction: false,
      env: 'development'
    },
    production: {
      isProduction: true,
      env: 'production'
    }
  }[process.env.NODE_ENV || 'development'];

  const version = fs.readFileSync(versionPath, 'utf8');
  const content = fs.readFileSync(configPath, 'utf8');
  const config = { ...((content) ? JSON.parse(content) : {}), ...environment };

  alter(config, 'configPath', configPath);
  alter(config, 'version', version);

  _.forEach(alterations, (value, property) => {
    alter(config, property, value);
  });

  return config;
};

export function CryptoContent(crypto) {
  this.privateKey = fs.readFileSync(crypto.privateKey);
  this.publicKey = fs.readFileSync(crypto.publicKey);
  this.certificate = fs.readFileSync(crypto.certificate);
}
