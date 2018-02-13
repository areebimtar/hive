import Promise from 'bluebird';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Logger } from 'logger';

import RabbitClient from './rabbitClient';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('RabbitClient', () => {
  let Amqp;
  let rabbitClient;
  let message;
  let amqpSubscribe;

  beforeEach(() => {
    amqpSubscribe = sinon.stub();
    Amqp = function dummyAmqp() {
      this.subscribe = amqpSubscribe;
    };
    RabbitClient.__Rewire__('Amqp', Amqp);

    rabbitClient = new RabbitClient('testUri', 'prefix', 2);

    message = { headers: { type: 'prefix.some.op.test' }, body: { test: 'message' } };
  });

  afterEach(() => {
    RabbitClient.__ResetDependency__('Amqp');

    sandbox.restore();
  });

  describe('retryMessage', () => {
    beforeEach(() => {
      sandbox.stub(rabbitClient, 'sendToQueue');
    });

    it('should publish message', async () => {
      const error = { message: 'error message' };
      await rabbitClient.retryMessage('shopifySyncShop', 'shopify-syncShop', error, message);

      expect(rabbitClient.sendToQueue).to.have.been.calledOnce;
      expect(rabbitClient.sendToQueue).to.have.been.calledWithExactly('shopify-syncShop', { headers: { type: 'prefix.some.op.test', retries: 1 }, body: { test: 'message' } });
    });
  });

  describe('notifyHandler', () => {
    let amqp;

    beforeEach(() => {
      sandbox.stub(rabbitClient, 'publish');

      amqp = { publish: sinon.stub().returns(Promise.resolve()) };
      rabbitClient._amqp = amqp;
    });

    it('should publish message', async () => {
      const error = { message: 'error message' };
      await rabbitClient.notifyHandler(error, message);

      expect(rabbitClient._amqp.publish).to.have.been.calledOnce;
      expect(rabbitClient._amqp.publish).to.have.been.calledWithExactly('prefix.channel-router', 'prefix.some.op.test.error', {
        headers: { type: 'prefix.some.op.test.error' },
        body: {
          originalMessage: message,
          error: 'error message',
          test: 'message'
        }
      });
    });
  });

  describe('handleError', () => {
    beforeEach(() => {
      sandbox.stub(rabbitClient, 'retryMessage');
      sandbox.stub(rabbitClient, 'notifyHandler');
    });

    it('should retry message', async () => {
      await rabbitClient.handleError('testRole', 'testQueue', 'test error', message);

      expect(rabbitClient.retryMessage).to.have.been.calledOnce;
      expect(rabbitClient.retryMessage).to.have.been.calledWithExactly('testRole', 'testQueue', 'test error', message);
    });

    it('should not retry message', async () => {
      message.headers.retries = 2;
      await rabbitClient.handleError('testRole', 'testQueue', 'test error', message);

      expect(rabbitClient.notifyHandler).to.have.been.calledOnce;
      expect(rabbitClient.notifyHandler).to.have.been.calledWithExactly('test error', message);
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      sandbox.stub(rabbitClient, 'ackMessage');
      sandbox.stub(rabbitClient, 'nackMessage');
      sandbox.stub(rabbitClient, 'handleError');

      message = { content: { test: 'message' } };
    });

    it('should call handler callback', async () => {
      const cb = sinon.stub().returns(Promise.resolve());
      await rabbitClient.handler('testRole', 'testQueue', cb, message);

      expect(cb).to.have.been.calledOnce;
      expect(cb.args[0][0]).to.be.an.instanceof(Logger);
      expect(cb.args[0][1]).to.eql({ test: 'message' });
    });

    it('should ack message if all went well', async () => {
      const cb = sinon.stub().returns(Promise.resolve());
      await rabbitClient.handler('testRole', 'testQueue', cb, message);

      expect(rabbitClient.ackMessage).to.have.been.calledOnce;
      expect(rabbitClient.ackMessage).to.have.been.calledWithExactly(message);
    });

    it('should nack message if handler returns "nack"', async () => {
      const cb = sinon.stub().returns(Promise.resolve('nack'));
      await rabbitClient.handler('testRole', 'testQueue', cb, message);

      expect(rabbitClient.nackMessage).to.have.been.calledOnce;
      expect(rabbitClient.nackMessage).to.have.been.calledWithExactly(message);
    });

    it('should handle exceptions in handler', async () => {
      const cb = sinon.stub().returns(Promise.reject('test error'));
      await rabbitClient.handler('testRole', 'testQueue', cb, message);

      expect(rabbitClient.nackMessage).to.have.been.calledOnce;
      expect(rabbitClient.nackMessage).to.have.been.calledWithExactly(message);

      expect(rabbitClient.handleError).to.have.been.calledOnce;
      expect(rabbitClient.handleError).to.have.been.calledWithExactly('testRole', 'testQueue', 'test error', { test: 'message' });
    });
  });

  describe('subscribe', () => {
    let cb;
    let bind;

    beforeEach(() => {
      bind = sinon.stub();
      sandbox.stub(rabbitClient, 'handler');
      rabbitClient.handler = { bind };

      amqpSubscribe.returns(Promise.resolve());

      RabbitClient.__Rewire__('ROLES_TO_QUEUE_MAP', { role1: ['${prefix}.role1-queue'], role2: ['${prefix}.role2-queue1', '${prefix}.role2-queue2', '${prefix}.role2-queue3'] });

      cb = sinon.stub().returns(Promise.resolve());
    });

    afterEach(() => {
      RabbitClient.__ResetDependency__('ROLES_TO_QUEUE_MAP');
    });

    it('should subscribe single handler per role', async () => {
      await rabbitClient.subscribe('role1', cb);

      expect(amqpSubscribe).to.have.been.calledOnce;
      expect(amqpSubscribe).to.have.been.calledWith('prefix.role1-queue');

      expect(bind).to.have.been.calledOnce;
      expect(bind).to.have.been.calledWithExactly(rabbitClient, 'role1', '${prefix}.role1-queue', cb);
    });

    it('should subscribe multiple handlers per role', async () => {
      await rabbitClient.subscribe('role2', cb);

      expect(amqpSubscribe).to.have.been.calledThrice;
      expect(bind).to.have.been.calledThrice;
      expect(amqpSubscribe).to.have.been.calledWith('prefix.role2-queue1');
      expect(bind).to.have.been.calledWithExactly(rabbitClient, 'role2', '${prefix}.role2-queue1', cb);
      expect(amqpSubscribe).to.have.been.calledWith('prefix.role2-queue2');
      expect(bind).to.have.been.calledWithExactly(rabbitClient, 'role2', '${prefix}.role2-queue2', cb);
      expect(amqpSubscribe).to.have.been.calledWith('prefix.role2-queue3');
      expect(bind).to.have.been.calledWithExactly(rabbitClient, 'role2', '${prefix}.role2-queue3', cb);
    });
  });
});
