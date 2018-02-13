import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import _ from 'lodash';

chai.use(sinonChai);

import WorkerPool from './workerPool';
const logger = {
  info: () => {},
  debug: () => {}
};

const worker = {
  _signals: {},
  _emit: (signal) => {
    if (!this._signals[signal]) { return; }
    this._signals[signal]();
  },
  on: sinon.spy((signal, handler) => {
    this._signals[signal] = handler;
  }),
  _disconnectHandlers: [],
  onDisconnect: sinon.spy((handler) => { worker._disconnectHandlers.push(handler); }),
  _disconnect: function() { // eslint-disable-line func-names
    _.each(this._disconnectHandlers, (handler) => { handler(); });
    this._disconnectHandlers = [];
  }
};

describe('WorkerPool', () => {
  it('should properly add and remove sockets', () => {
    const pool = new WorkerPool(logger);
    pool.add(worker);
    expect(pool.getNumIdle()).to.be.equal(1);
    expect(worker.onDisconnect).to.have.been.called;
    worker._disconnect();
    expect(pool.getNumIdle()).to.be.equal(0);
  });

  it('should properly borrow and return workers', () => {
    const pool = new WorkerPool(logger);
    pool.add(worker);
    const tmp = pool.borrow();
    expect(tmp).to.be.equal(worker);
    expect(pool.getNumIdle()).to.be.equal(0);
    pool.return(tmp);
    expect(pool.getNumIdle()).to.be.equal(1);
  });
});
