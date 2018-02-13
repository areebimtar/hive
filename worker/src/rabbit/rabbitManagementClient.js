// NOTE: This module is required from a pg-migrate migration and does not get run through node-babel.
// Hence the use of require over import and other Node 6 compliant conventions

const Promise = require('bluebird');
const superagent = require('superagent');
const superagentPromise = require('superagent-promise');
const request = superagentPromise(superagent, Promise);

module.exports = function rabbitManagementClientFactory(rabbitUri, userName, password, vhost) {
  function createQueue(queueId, configuration) {
    const uri = `${rabbitUri}/api/queues/${vhost}/${queueId}`;
    return request.put(uri).auth(userName, password).send(configuration);
  }

  function createVhost(vhostName) {
    const createVhostUri = `${rabbitUri}/api/vhosts/${vhostName}`;
    const grantPermissionsUri = `${rabbitUri}/api/permissions/${vhostName}/${userName}`;
    const grantPermissionsBody = {
      vhost: vhostName,
      username: userName,
      configure: '.*',
      write: '.*',
      read: '.*'
    };

    const promise = request
      .put(createVhostUri)
      .set('Content-Type', 'application/json')
      .auth(userName, password);

    return promise.then(() => request
      .put(grantPermissionsUri)
      .auth(userName, password)
      .send(grantPermissionsBody));
  }

  function createPersistentMessage(queueId, messageCount) {
    const populateUri = `${rabbitUri}/api/exchanges/${vhost}/amq.default/publish`;
    const promises = [];
    for (let i = 0; i < messageCount; i++) {
      const message = {
        delivery_mode: 2,
        routing_key: queueId,
        payload: `Persistent message # ${i + 1}`,
        properties: {},
        payload_encoding: 'string'
      };
      promises.push(request.post(populateUri).auth(userName, password).send(message));
    }
    return Promise.all(promises);
  }

  return {
    createVhost: createVhost,
    deleteVhost: (name) =>  request.del(`${rabbitUri}/api/vhosts/${name}`).auth(userName, password),
    createQueue: createQueue,
    deleteQueue: (queueId) => request.del(`${rabbitUri}/api/queues/${vhost}/${queueId}`).auth(userName, password),
    createPersistentMessage: createPersistentMessage
  };
};
