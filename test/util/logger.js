import sinon from 'sinon';

export class Logger {
  constructor() {
    this.debug = sinon.stub();
    this.error = sinon.stub();
    this.info = sinon.stub();
    this.warn = sinon.stub();
    this.verbose = sinon.stub();
    this.silly = sinon.stub();
    this.process = sinon.stub();
    this.processed = sinon.stub();
    this.publishMessage = sinon.stub();
  }
}

export default new Logger();
