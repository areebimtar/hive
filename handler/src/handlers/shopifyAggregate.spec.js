import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ShopifyAggregate from './shopifyAggregate';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('shopifyAggregate', () => {
  let models;
  let rabbit;
  let message;
  let shopifyAggregate;

  beforeEach(() => {
    rabbit = {
      publish: sinon.stub()
    };

    models = {
      db: {
        tx: fn => fn('transaction')
      },
      aggregates: {
        add: sinon.stub(),
        getByParentMessageId: sinon.stub(),
        deleteByParentMessageId: sinon.stub(),
        markAsDeletedByParentId: sinon.stub()
      }
    };

    message = {
      headers: {
        type: 'test.message',
        shopId: 123,
        messageId: '1234567890',
        total: 2
      },
      stack: [{ type: 'prefix.shopify.syncShop', messageId: '3456789012' }, { type: 'some.other.type', messageId: '4567890123' }],
      body: {
        status: 'test status',
        message: 'test result message'
      }
    };

    shopifyAggregate = new ShopifyAggregate(null, models, rabbit);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('insertAggregates', () => {
    it('should add new aggregate row', async () => {
      await shopifyAggregate.insertAggregates(logger, message, 'transaction');

      expect(models.aggregates.add).to.have.been.called;
      expect(models.aggregates.add).to.have.been.calledWithExactly(123, '3456789012', '1234567890', 'test status', 'test result message', 'transaction');
    });

    it('should finish gracefully if aggregate rows already exists', async () => {
      models.aggregates.add.throws();
      try {
        await shopifyAggregate.insertAggregates(logger, message, 'transaction');
      } catch (error) {
        expect(true).to.be.false;
      }

      expect(models.aggregates.add).to.have.been.called;
      expect(models.aggregates.add).to.have.been.calledWithExactly(123, '3456789012', '1234567890', 'test status', 'test result message', 'transaction');
    });
  });

  describe('getAggregates', () => {
    it('should get aggregates', async () => {
      await shopifyAggregate.getAggregates(message, 'transaction');

      expect(models.aggregates.getByParentMessageId).to.have.been.called;
      expect(models.aggregates.getByParentMessageId).to.have.been.calledWithExactly('3456789012', 'transaction');
    });
  });

  describe('areAllAggregatesDone', () => {
    it('should be true', () => {
      const aggregates = [{}, {}];
      expect(shopifyAggregate.areAllAggregatesDone(message, aggregates)).to.be.true;
    });

    it('should be false', () => {
      const aggregates = [{}];
      expect(shopifyAggregate.areAllAggregatesDone(message, aggregates)).to.be.false;
    });

    it('should throw', () => {
      const aggregates = [{}, {}, {}];
      try {
        expect(shopifyAggregate.areAllAggregatesDone(message, aggregates)).to.be.false;
        expect(false).to.be.true;
      } catch (err) {
        expect(true).to.be.true;
      }
    });
  });

  describe('notifyParentTask', () => {
    it('should enqueue messasge', async () => {
      const aggregates = [{res_ult: 1}, {res_ult: 2}];
      await shopifyAggregate.notifyParentTask(logger, message, aggregates);

      expect(rabbit.publish).to.have.been.called;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.channel-router', 'prefix.shopify.syncShop.subtasksCompleted', {
        body: { results: [{resUlt: 1}, {resUlt: 2}] },
        headers: { type: 'prefix.shopify.syncShop.subtasksCompleted', messageId: '3456789012' },
        stack: [{ type: 'some.other.type', messageId: '4567890123' }]
      });
    });
  });

  describe('markAggregatesForRemoval', () => {
    it('should mark all aggregates for removal', async () => {
      await shopifyAggregate.markAggregatesForRemoval(logger, message, 'transaction');

      expect(models.aggregates.markAsDeletedByParentId).to.have.been.called;
      expect(models.aggregates.markAsDeletedByParentId).to.have.been.calledWithExactly('3456789012', 'transaction');
    });
  });

  describe('removeAggregates', () => {
    it('should remove all aggregates', async () => {
      await shopifyAggregate.removeAggregates(logger, message);

      expect(models.aggregates.deleteByParentMessageId).to.have.been.called;
      expect(models.aggregates.deleteByParentMessageId).to.have.been.calledWithExactly('3456789012');
    });
  });

  describe('process', () => {
    beforeEach(() => {
      sandbox.stub(shopifyAggregate, 'insertAggregates');
      sandbox.stub(shopifyAggregate, 'getAggregates');
      sandbox.stub(shopifyAggregate, 'areAllAggregatesDone');
      sandbox.stub(shopifyAggregate, 'notifyParentTask');
      sandbox.stub(shopifyAggregate, 'removeAggregates');
      sandbox.stub(shopifyAggregate, 'markAggregatesForRemoval');

      shopifyAggregate.getAggregates.returns('aggregates');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should store task result', async () => {
      shopifyAggregate.areAllAggregatesDone.returns(false);
      await shopifyAggregate.process(logger, message);

      expect(shopifyAggregate.insertAggregates).to.have.been.calledOnce;
      expect(shopifyAggregate.insertAggregates.args[0][1]).to.eql(message);

      expect(shopifyAggregate.getAggregates).to.have.been.calledOnce;
      expect(shopifyAggregate.getAggregates).to.have.been.calledWithExactly(message, 'transaction');

      expect(shopifyAggregate.areAllAggregatesDone).to.have.been.calledOnce;
      expect(shopifyAggregate.areAllAggregatesDone).to.have.been.calledWithExactly(message, 'aggregates');

      expect(shopifyAggregate.notifyParentTask).not.to.have.been.called;
      expect(shopifyAggregate.removeAggregates).not.to.have.been.called;
    });

    it('should cleanup and notify parent', async () => {
      shopifyAggregate.areAllAggregatesDone.returns(true);
      await shopifyAggregate.process(logger, message);

      expect(shopifyAggregate.insertAggregates).to.have.been.calledOnce;
      expect(shopifyAggregate.insertAggregates.args[0][1]).to.eql(message);

      expect(shopifyAggregate.getAggregates).to.have.been.calledOnce;
      expect(shopifyAggregate.getAggregates).to.have.been.calledWithExactly(message, 'transaction');

      expect(shopifyAggregate.areAllAggregatesDone).to.have.been.calledOnce;
      expect(shopifyAggregate.areAllAggregatesDone).to.have.been.calledWithExactly(message, 'aggregates');

      expect(shopifyAggregate.notifyParentTask).to.have.been.calledOnce;
      expect(shopifyAggregate.notifyParentTask.args[0][1]).to.eql(message);
      expect(shopifyAggregate.notifyParentTask.args[0][2]).to.eql('aggregates');

      expect(shopifyAggregate.markAggregatesForRemoval).to.have.been.calledOnce;
      expect(shopifyAggregate.markAggregatesForRemoval).to.have.been.calledWithExactly(logger, message, 'transaction');
    });
  });
});
