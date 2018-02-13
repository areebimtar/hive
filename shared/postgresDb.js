import Promise from 'bluebird';
import PgPromiseModule from 'pg-promise';
import Monitor from 'pg-monitor';
import logger from 'logger';

function setupQueriesLogger(options, config) {
  Monitor.setLog((msg, info = {}) => {
    info.display = false;
    const logFn = info.event === 'error' ? logger.error : logger.debug;
    logFn('SQL', info.text);
  });

  options.receive = (data, result, e) => {
    if (result && result.duration >= config.slowQueriesMinDuration) {
      logger.info({ topic: 'slowDbQuery', time: result.duration, query: e.query });
    }
  };

  options.query = (e) =>
    Monitor.query(e, true);

  options.error = (error, e) =>
    Monitor.error(error, e, true);

  options.task = Monitor.task;

  options.transact = Monitor.transact;
}

export default class PostgreDb {
  constructor(config) {
    const options = {
      promiseLib: Promise
    };

    const pgp = PgPromiseModule(options);
    this._db = pgp(config);

    if (config.logQueries) {
      setupQueriesLogger(options, config);
    }

    this.many = this._db.many.bind(this._db);
    this.one = this._db.one.bind(this._db);
    this.none = this._db.none.bind(this._db);
    this.any = this._db.any.bind(this._db);
    this.oneOrNone = this._db.oneOrNone.bind(this._db);
    this.manyOrNone = this._db.manyOrNone.bind(this._db);
    this.tx = this._db.tx.bind(this._db);
    this.end = pgp.end;
  }
}
