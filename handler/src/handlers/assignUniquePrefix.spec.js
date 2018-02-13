import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import AssignUniquePrefix from './assignUniquePrefix';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

const USER_ID = 11;
const SHOP_ID = 123;

describe('AssignUniquePrefix', () => {
  let models;
  let rabbit;
  let message;
  let messageUtils;
  let assignUniquePrefix;

  beforeEach(() => {
    rabbit = {
      publish: sinon.stub()
    };

    models = {
      auth: {
        users: {
          getById: sinon.stub()
        }
      }
    };

    message = {
      headers: {
        userId: USER_ID,
        shopId: SHOP_ID,
        type: 'shopify.testType'
      },
      body: 'test body'
    };

    messageUtils = AssignUniquePrefix.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');
    messageUtils.getNewMessageId.returns('test message id');

    assignUniquePrefix = new AssignUniquePrefix(null, models, rabbit);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should fail if there is no user', async () => {
    try {
      await assignUniquePrefix.process(logger, message);
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }
  });

  it('should enqueue message', async () => {
    models.auth.users.getById.returns({ db: 'db1', type: 'stable' });
    await assignUniquePrefix.process(logger, message);

    expect(rabbit.publish).to.have.been.calledOnce;
    expect(rabbit.publish).to.have.been.calledWithExactly(logger, 'unique-prefix-router', 'db1-stable.shopify.testType', {
      headers: {
        userId: USER_ID,
        shopId: SHOP_ID,
        messageId: 'test message id',
        type: 'db1-stable.shopify.testType'
      },
      body: 'test body'
    });
  });
});
