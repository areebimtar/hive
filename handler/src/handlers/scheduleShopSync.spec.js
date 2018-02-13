import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import logger from 'logger';

import ScheduleShopSync from './scheduleShopSync';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('ScheduleShopSync', () => {
  let scheduleShopSync;
  let config;
  let rabbit;
  let models;
  let messageUtils;

  beforeEach(() => {
    messageUtils = ScheduleShopSync.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');

    config = {
      shopify: {
        maxListingsPerCheckShopSync: 300,
        checkShopSyncMessageTTL: 30000
      },
      prefix: 'prefix'
    };

    models = {
      compositeRequests: {
        getShopsToSync: sinon.stub().resolves([{id: '1'}, {id: '2'}]),
        getShopAccountByShopId: sinon.stub().resolves([null, { company_id: '11'}])
      },
      auth: {
        users: {
          getByCompanyId: sinon.stub().resolves({id: '123'})
        }
      }
    };

    rabbit = {
      publish: sinon.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('scheduleShopSync', () => {
    beforeEach(() => {
      messageUtils.getNewMessageId.returns('1234567890');

      scheduleShopSync = new ScheduleShopSync(config, models, rabbit);
      scheduleShopSync.scheduleShopSync(logger, '1', '123');
    });

    it('should enqueue message', () => {
      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, 'commands', 'shopify.syncShop', {
        headers: {
          type: 'shopify.syncShop',
          messageId: '1234567890',
          shopId: '1',
          userId: '123'
        },
        stack: [],
        body: {}
      });
    });
  });

  describe('process', () => {
    let result;

    beforeEach(async () => {
      scheduleShopSync = new ScheduleShopSync(config, models, rabbit);

      sandbox.stub(scheduleShopSync, 'scheduleShopSync');
      sandbox.stub(scheduleShopSync, 'getUserIdByShopId');
      scheduleShopSync.scheduleShopSync.resolves();
      scheduleShopSync.getUserIdByShopId.onCall(0).resolves('123');
      scheduleShopSync.getUserIdByShopId.onCall(1).resolves('234');
      result = await scheduleShopSync.process(logger, 'token');
    });

    it('should get shops ready for sync', () => {
      expect(models.compositeRequests.getShopsToSync).to.have.been.calledOnce;
      expect(models.compositeRequests.getShopsToSync).to.have.been.calledWithExactly(21600000, 300, 2);
    });

    it('should resolve userId for shopId', () => {
      expect(scheduleShopSync.getUserIdByShopId).to.have.been.calledTwice;
      expect(scheduleShopSync.getUserIdByShopId).to.have.been.calledWithExactly(logger, '1');
      expect(scheduleShopSync.getUserIdByShopId).to.have.been.calledWithExactly(logger, '2');
    });

    it('should schedule shops sync', () => {
      expect(scheduleShopSync.scheduleShopSync).to.have.been.calledTwice;
      expect(scheduleShopSync.scheduleShopSync).to.have.been.calledWithExactly(logger, '1', '123');
      expect(scheduleShopSync.scheduleShopSync).to.have.been.calledWithExactly(logger, '2', '234');
    });

    it('should return NACK status code', () => {
      expect(result).to.eql('nack');
    });
  });
});
