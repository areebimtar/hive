import _ from 'lodash';

export default class WorkerPool {
  constructor(logger) {
    this._freeWorkers = [];
    this._busyWorkers = {};
    this._logger = logger; // TODO: Remove me when babel6 will be fixed
  }

  add(worker) {
    this._logger.info(`Add worker to pool: ${worker.id}`);
    this._freeWorkers.push(worker);
    worker.onDisconnect(() => {
      this._logger.debug(`Worker disconnected: ${worker.id}`);
      const freeIndex = _.findIndex(this._freeWorkers, worker);
      if (freeIndex !== -1) {
        this._logger.info(`Remove free worker from pool: ${worker.id}`);
        this._freeWorkers.splice(freeIndex, 1);
      } else if (this._busyWorkers[worker.id]) {
        this._logger.info(`Remove busy worker from pool: ${worker.id}`);
        delete this._busyWorkers[worker.id];
      }
    });
  }

  getNumIdle() { return this._freeWorkers.length; }
  getNumBusy() { return Object.keys(this._busyWorkers).length; }

  borrow() {
    const worker = this._freeWorkers.shift();
    this._busyWorkers[worker.id] = worker;
    this._logger.info(`Borrow worker: ${worker.id}`);
    return worker;
  }

  return(worker) {
    if (!this._busyWorkers[worker.id]) { return; }
    this._logger.info(`Return worker: ${worker.id}`);

    this._freeWorkers.push(this._busyWorkers[worker.id]);
    delete this._busyWorkers[worker.id];
  }
}
