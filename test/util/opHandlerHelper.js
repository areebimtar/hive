import _ from 'lodash';
import * as operationHandlers from '../../worker/src/operationHandlers';
import { createDbHelper, noopLogger } from './';
import managerHelper from './managerHelper';

const defaultRequests = { requestsMade: 0 };
const defaultConfig = {
  etsy: {
    apiUrl: 'http://notreallyetsy',
    auth: {
      consumerKey: 'consumerKey',
      consumerSecret: 'consumerSecret',
      requestTokenURL: 'requestTokenURL',
      accessTokenURL: 'accessTokenURL',
      userAuthorizationURL: 'userAuthorizationURL'
    }
  },
  auth: {
    prefix: ''
  }
};

async function startTaskByName(name, config, models, logger, data, taskId, manager, requests, rateLimiter) {
  const dbHelper = createDbHelper();
  const handler = operationHandlers[name];
  if (!handler) {
    throw new Error(`No operation handler found ${name}`);
  }

  const managerMock = managerHelper(config || defaultConfig, models || dbHelper.getModels(), logger || noopLogger);

  // function start(config, models, logger, data, taskId, manager, requests, rateLimiter) {
  return handler.start(
    config || defaultConfig,
    models || dbHelper.getModels(),
    logger || noopLogger,
    data,
    taskId,
    manager || managerMock,
    requests || defaultRequests,
    rateLimiter
  );
}

async function resumeTaskByName(name, config, models, logger, data, suspensionPoint, wasModified, taskId, manager) {
  const dbHelper = createDbHelper();
  const handler = operationHandlers[name];
  if (!handler) {
    throw new Error(`No operation handler found ${name}`);
  }

  const managerMock = managerHelper(config || defaultConfig, models || dbHelper.getModels(), logger || noopLogger);

  // function start(config, models, logger, data, taskId, manager, requests, rateLimiter) {
  return handler.resume(
    config || defaultConfig,
    models || dbHelper.getModels(),
    logger || noopLogger,
    data,
    suspensionPoint,
    wasModified,
    taskId,
    manager || managerMock
  );
}

export const opHandlers = {};
_.forEach(operationHandlers, (handler, name) => {
  opHandlers[name] = {
    start: startTaskByName.bind(null, name),
    resume: resumeTaskByName.bind(null, name)
  };
});
