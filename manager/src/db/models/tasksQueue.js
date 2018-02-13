import _ from 'lodash';
import Promise from 'bluebird';
import { TASK } from '../../constants';
import pgSquel from '../../../../shared/pgSquel';

export default class TasksQueue {
  constructor(db) {
    this._db = db;
  }

  // Get all tasks from db
  // Except tasks that are already 'done'
  getAllUnfinishedTasks(db) {
    try {
      const connection = db || this._db;
      const { text, values } = pgSquel
        .select()
        .from('task_queue')
        .where(pgSquel.expr()
        .or('state is NULL')
        .or('state not in ?', [TASK.STATE.DONE, TASK.STATE.FAILED, TASK.STATE.ABORTED]))
        .order('created_at')
        .toParam();

      return connection.any(text, values);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  enqueueTask(parentTaskId, retry, suspensionPoint, companyId, channelId, operation, operationData, db) {
    // TODO: We have to use upsert here, to not insert duplications
    try {
      const connection = db || this._db;
      const { text, values } = pgSquel
        .insert()
        .into('task_queue')
        .set('parent_id', _.isFinite(parentTaskId) ? parentTaskId : null)
        .set('retry', _.isFinite(retry) ? retry : 0)
        .set('suspension_point', _.isString(suspensionPoint) ? suspensionPoint : null)
        .set('company_id', companyId)
        .set('channel_id', channelId)
        .set('operation', operation)
        .set('operation_data', operationData)
        .returning('id')
        .toParam();

      return connection.one(text, values).get('id');
    } catch (e) {
      return Promise.reject(e);
    }
  }

  markTaskModified(id, db) {
    try {
      const connection = db || this._db;

      const { text, values } = pgSquel
        .update()
        .table('task_queue')
        .set('modified', true)
        .set('retry', 0)
        .where('id = ?::bigint', id)
        .toParam();

      return connection.none(text, values);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async clearModifiedFlag(id, connection = this._db) {
    const { text, values } = pgSquel.update().table('task_queue').set('modified', false).where('id=?::bigint', id).toParam();

    return connection.none(text, values);
  }

  // ttl in seconds
  setTaskState(id, state, stateTtl, suspensionPoint, result, db) {
    try {
      const connection = db || this._db;

      const expiresAt = _.isFinite(stateTtl) ? pgSquel.str('now() + interval \'? milliseconds\'', stateTtl) : null;
      const { text, values } = pgSquel
        .update()
        .table('task_queue')
        .set('state', state)
        .set('state_expires_at', expiresAt)
        .set('suspension_point', _.isString(suspensionPoint) ? suspensionPoint : null)
        .set('result', _.isString(result) ? result : null)
        .where('id = ?::bigint', id)
        .toParam();

      return connection.none(text, values);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
