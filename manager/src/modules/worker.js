import _ from 'lodash';

// import { WORKER, MANAGER } from 'global/constants';
import { WORKER, MANAGER } from '../../../shared/constants';

function cloneTask(task) {
  const clonedTask = _.cloneDeep(task);
  if (task.createdAt) { clonedTask.createdAt = task.createdAt.toISOString(); }
  if (task.stateExpiresAt) { clonedTask.stateExpiresAt = task.stateExpiresAt.toISOString(); }
  return clonedTask;
}

export default class Worker {
  constructor(socket, logger) { // TODO: remove logger
    this.id = socket.id;
    this._socket = socket;
    this._logger = logger;
  }

  onDisconnect(handler) {
    this._socket.on('disconnect', handler);
  }

  terminate() {
    this._socket.disconnect();
  }

  onTaskResult(handler) {
    const callback = (result) => {
      handler(result);
      this._socket.removeListener(MANAGER.TASK_OPERATIONS.RESULT, callback);
    };
    this._socket.on(MANAGER.TASK_OPERATIONS.RESULT, callback);
  }

  start(task) {
    this._logger.debug(`[${this._socket.id}] Start task #${task.id}`);
    const clonedTask = cloneTask(task);

    this._logger.debug(clonedTask);
    this._socket.emit(WORKER.TASK_OPERATIONS.START, clonedTask);
  }

  resume(task) {
    this._logger.debug(`[${this._socket.id}] Resume task #${task.id}`);
    const clonedTask = cloneTask(task);

    this._logger.debug(clonedTask);
    this._socket.emit(WORKER.TASK_OPERATIONS.RESUME, clonedTask);
  }
}
