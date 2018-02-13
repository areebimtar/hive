import express from 'express';
import bodyParser from 'body-parser';


const queueRepresentation = ({id, quotaRemaining, tasksActive, tasks}) => ({
  id, quotaRemaining, tasksActive, taskCount: (tasks ? tasks.length : 0)
});

export default class ManagerAPI {

  constructor(managerApp, logger) {
    this._managerApp = managerApp;
    this._taskQueue = managerApp._taskQueue;
    this._quotaLimit = this._taskQueue._quotaLimit;
    this._logger = logger;

    this._api = express();

    this._api.use(bodyParser.urlencoded({ extended: false }));

    this._api.get('/stats', this.getStats.bind(this));
    this._api.get('/workers', this.getNumberOfWorkers.bind(this));
    this._api.get('/queues', this.getQueueList.bind(this));
    this._api.get('/queues/exhausted', this.getQueueListExhausted.bind(this));
    this._api.get('/queue/:id', this.getQueue.bind(this));
    this._api.get('/queue/:id/reservedQuota', this.getQueueQuotaReserved.bind(this));
    this._api.post('/queue/:id/reservedQuota', this.setQueueQuotaReserved.bind(this));

    return this;
  }

  listen(port) {
    this._api.listen(port, '127.0.0.1', () => {
      this._logger.log(`Manager API listening on port ${port}.`);
    });
  }

  getStats(req, res) {
    const numIdle = this._managerApp._pool.getNumIdle();
    const numBusy = this._managerApp._pool.getNumBusy();

    const queues = this._taskQueue._queues;

    const queueCount = queues.length;
    const taskCount = queues.reduce((acc, q) => acc + q.tasks.length, 0);
    const taskIndexSize = Object.keys(this._taskQueue._taskIndex).length;
    const queueIndexSize = Object.keys(this._taskQueue._queueIndex).length;

    res.json({ workers: {numIdle, numBusy}, queueCount, queueIndexSize, taskCount, taskIndexSize});
  }

  getNumberOfWorkers(req, res) {
    const numIdle = this._managerApp._pool.getNumIdle();
    const numBusy = this._managerApp._pool.getNumBusy();
    res.json({idle: numIdle, busy: numBusy});
  }

  getQueueList(req, res) {
    let queues = this._taskQueue._queues;
    queues = queues.map(queueRepresentation);
    res.json(queues);
  }

  getQueueListExhausted(req, res) {
    let queues = this._taskQueue._queues;
    queues = queues.filter(queue => this._quotaLimit.checkExhausted(queue));
    queues = queues.map(queueRepresentation);
    res.json(queues);
  }

  getQueue(req, res) {
    const queue = this._taskQueue._getQueueById(req.params.id);

    if (typeof queue === 'undefined') return res.json('queue not found');

    return res.json(queue);
  }

  getQueueQuotaReserved(req, res) {
    const queue = this._taskQueue._getQueueById(req.params.id);

    if (typeof queue === 'undefined') return res.json('queue not found');

    const quotaReserved = this._quotaLimit.getReserveForQueue(queue);
    return res.json(quotaReserved);
  }

  setQueueQuotaReserved(req, res) {
    if (typeof req.body.reservedQuotaAsPercentage  === 'undefined') return res.json('reservedQuotaAsPercentage is required');

    const queue = this._taskQueue._getQueueById(req.params.id);

    if (typeof queue === 'undefined') return res.json('queue not found');

    const timeout = req.body.timeoutInMs ? parseInt(req.body.timeoutInMs, 10) : undefined;
    const result = this._quotaLimit.setReserveForQueue(queue, parseInt(req.body.reservedQuotaAsPercentage, 10), timeout);
    return res.json(result);
  }

}
