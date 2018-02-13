import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { noopLogger } from '../../../test/util';
import amqplibMock from 'amqplib-mocks';

import connect from './amqpConnect';

chai.use(chaiAsPromised);
chai.use(sinonChai);


describe('AmpqConnect - unit tests with fake AmqpLib', () => {
  before(() => {
    // replace the node_modules AmqpLib with the amqplib-mock
    connect.__Rewire__('AmqpLib', amqplibMock);

    // now rewire a private function so we can get access to the underlying connection and
    // channel objects that are internal to our AmqpConnect class
    const originalFn = connect.__get__('getPublicInterface');
    const newFn = (instance) => {
      const result = originalFn(instance);
      result._connection = instance.connection;
      result._channel = instance.channel;
      return result;
    };
    connect.__set__('getPublicInterface', newFn);
  });

  after(() => {
    connect.__ResetDependency__('AmqpLib');
  });

  // set up a sandbox for easy cleanup of any stubs/spies we create
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    // clean up sinon
    sandbox.restore();
    // clean up the mock connections/channels
    amqplibMock.reset();
  });

  describe('connect function', () => {
    it('can connect', async function canConnect() {
      await expect(connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true })).to.be.fulfilled;
    });

    it('calls the onconnect callback when it connects', async function callsOnConnect() {
      const onConnectCallbacks = [sinon.spy()];
      await connect('amqp://foo', noopLogger, onConnectCallbacks, { assertPrecreatedQueues: true });
      expect(onConnectCallbacks[0]).to.have.been.calledOnce;
    });

    it(`rejects if the amqp connect function fails and doesn't execute the callback`, async function rejectsOnConnectFail() {
      const onConnectCallbacks = [sinon.spy()];
      sandbox.stub(amqplibMock, 'connect').throws();
      await expect(connect('amqp://foo', noopLogger, onConnectCallbacks, { assertPrecreatedQueues: true })).to.be.rejected;
      expect(onConnectCallbacks[0]).to.not.have.been.called;
    });
  });

  describe('subscribe function', () => {
    it('passes valid messages to the handler', async function passesMessages() {
      const handler = sinon.spy();
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('my-queue-name');
      await amqp.subscribe('my-queue-name', handler);
      await amqp.push('my-queue-name', {hello: 'World'});
      expect(handler).to.have.been.calledOnce;
      const args = handler.args[0][0];
      expect(args).to.have.property('content').and.eql({ hello: 'World' });
    });

    it('handles empty messages by logging them', async function logsEmptyMessage() {
      const handler = sandbox.spy();
      const errorLogger = sandbox.spy(noopLogger, 'error');
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('my-queue-name');
      await amqp.subscribe('my-queue-name', handler);
      // amqplib gives empty messages when rabbit sends a close event and amqplib-mocks provides
      // the closeConsumer method to simulate this.
      await amqp._channel.closeConsumer('my-queue-name');
      expect(errorLogger).to.have.been.calledOnce;
      expect(errorLogger).to.have.been.calledWith({
        topic: 'amqp',
        event: 'consumeError',
        args: [{ error: 'Empty message'}]
      });
      expect(handler).not.to.have.been.called;
    });

    it('handles non-json messages by logging an error', async function handlesNonJson() {
      const handler = sinon.spy();
      const errorLogger = sandbox.spy(noopLogger, 'error');
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('my-queue-name');
      await amqp.subscribe('my-queue-name', handler);
      await amqp._channel.sendToQueue('my-queue-name', 'aboom');
      expect(errorLogger).to.have.been.calledOnce;
      expect(errorLogger).to.have.been.calledWith({
        topic: 'amqp',
        event: 'consumeError',
        args: [{ error: 'Failed to parse message.content'}]
      });
      expect(handler).not.to.have.been.called;
    });

    it('handles consume errors', async function handlesConsumeError() {
      const handler = sinon.spy();
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('my-queue-name');
      sandbox.stub(amqp._channel, 'consume').throws();
      const subscribeSpy = sandbox.spy(amqp, 'subscribe');
      await amqp.subscribe('my-queue-name', handler);
      expect(subscribeSpy).not.to.have.thrown();
    });
  });

  describe('subscribeTokens function', () => {
    it('passes text only messages to the handler', async function passesText() {
      const handler = sinon.spy();
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('check-shop-sync');
      await amqp.subscribeTokens('check-shop-sync', handler);
      await amqp._channel.sendToQueue('check-shop-sync', 'not-json-at-all');
      expect(handler).to.have.been.calledOnce;
      const args = handler.args[0][0];
      expect(args).to.have.property('content').and.eql('not-json-at-all');
    });

    it('handles empty messages by logging them', async function handlesEmptyMessages() {
      const handler = sandbox.spy();
      const errorLogger = sandbox.spy(noopLogger, 'error');
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('check-shop-sync');

      await amqp.subscribeTokens('check-shop-sync', handler);
      // amqplib gives empty messages when rabbit sends a close event and amqplib-mocks provides
      // the closeConsumer method to simulate this.
      await amqp._channel.closeConsumer('check-shop-sync');
      expect(errorLogger).to.have.been.calledOnce;
      expect(errorLogger).to.have.been.calledWith({
        topic: 'amqp',
        event: 'consumeError',
        args: [{ error: 'Empty message'}]
      });
      expect(handler).not.to.have.been.called;
    });

    it('handles consume errors', async function handlesConsumeError() {
      const handler = sinon.spy();
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      amqp.createQueue('check-shop-sync');
      sandbox.stub(amqp._channel, 'consume').throws();
      const subscribeSpy = sandbox.spy(amqp, 'subscribe');
      await amqp.subscribeTokens('my-queue-name', handler);
      expect(subscribeSpy).not.to.have.thrown();
    });
  });

  describe('push function', () => {
    it('handles failure on push', async function handlesPushFailure() {
      const amqp = await connect('amqp://foo', noopLogger, null, { assertPrecreatedQueues: true });
      sandbox.stub(amqp._channel, 'sendToQueue').throws();
      const subscribeSpy = sandbox.spy(amqp, 'push');
      await amqp.push('my-queue-name', JSON.stringify({message: 'Hello'}));
      expect(subscribeSpy).not.to.have.thrown();
    });
  });
});
