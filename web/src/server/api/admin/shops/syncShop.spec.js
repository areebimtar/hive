import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import { expectResponseWasSent } from '../../../../../../test/util';

import syncShop from './syncShop';
import { SHOP_SYNC_STATUS_DUPLICATE } from '../../../../../../shared/db/models/constants';

chai.use(sinonChai);

describe('API GET /admin/shops/:shopId/sync', () => {
  const errorMessage = 'error message';

  let shop;
  let account;
  let models;
  let rabbitClient;
  let req;
  let res;

  beforeEach(() => {
    shop = {
      id: 5,
      account_id: 1,
      company_id: 10,
      channel_shop_id: 5000
    };
    account = {
      id: 1,
      company_id: 10,
      channel_id: 1
    };
    models = {
      shops: {
        getById: sinon.spy(() => Promise.resolve(shop)),
        getByChannelShopId: sinon.spy(() => Promise.resolve([shop])),
        resetError: sinon.spy(() => Promise.resolve()),
        resetInvalidFlag: sinon.spy(() => Promise.resolve())
      },
      accounts: {
        getById: sinon.spy(() => Promise.resolve(account))
      }
    };
    rabbitClient = {
      enqueueShopSyncEtsy: sinon.stub().resolves(),
      enqueueShopSync: sinon.stub().resolves()
    };
    req = {
      params: {
        shopId: 5
      },
      session: {
        db: 'db1',
        userId: 123
      }
    };
    const sendSpy = sinon.spy();
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({
      json: jsonSpy,
      send: sendSpy
    });
    res = {
      json: jsonSpy,
      status: statusStub,
      sendSpy
    };
  });

  it('models.shops.getById is called with correct shop id', () => {
    return syncShop(undefined, models, rabbitClient, req, res)
      .then(() => {
        expect(models.shops.getById).to.have.been.calledWith(req.params.shopId);
        expectResponseWasSent(res);
      });
  });

  it('models.shops.getByChannelShopId is called with correct shop account id', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    return syncShop(undefined, models, rabbitClient, req, res)
      .then(() => {
        expect(models.shops.getByChannelShopId).to.have.been.calledWith(shop.channel_shop_id);
        expectResponseWasSent(res);
      });
  });

  it('models.shops.resetError is called with correct shop id', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    return syncShop(undefined, models, rabbitClient, req, res)
      .then(() => {
        expect(models.shops.resetError).to.have.been.calledWith(req.params.shopId);
        expectResponseWasSent(res);
      });
  });

  it('models.shops.resetInvalidFlag is called with correct shop id', () => {
    return syncShop(undefined, models, rabbitClient, req, res)
      .then(() => {
        expect(models.shops.resetInvalidFlag).to.have.been.calledWith(req.params.shopId);
        expectResponseWasSent(res);
      });
  });

  it('models.accounts.getById is called with correct shop account id', () => {
    return syncShop(undefined, models, rabbitClient, req, res)
      .then(() => {
        expect(models.accounts.getById).to.have.been.calledWith(shop.account_id);
        expectResponseWasSent(res);
      });
  });

  it('rabbitClient.enqueueShopSyncEtsy is called with correct account company id, account channel id and shop id',
    () => {
      return syncShop(undefined, models, rabbitClient, req, res)
        .then(() => {
          expect(rabbitClient.enqueueShopSyncEtsy).to.have.been
            .calledWith(account.company_id, account.channel_id, req.params.shopId);
          expectResponseWasSent(res);
        });
    });

  it('rabbitClient.enqueueShopSync is called with correct user id and shop id',
    () => {
      models.accounts.getById = sinon.stub().resolves({ id: 1, channel_id: 2 });
      return syncShop(undefined, models, rabbitClient, req, res)
        .then(() => {
          expect(rabbitClient.enqueueShopSync).to.have.been
            .calledWith(123, req.params.shopId);
          expectResponseWasSent(res);
        });
    });

  it('returns 200 when all is ok', () => {
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expectResponseWasSent(res);
    });
  });

  it('returns 200 when shop is unsyncable but the only one', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expectResponseWasSent(res);
    });
  });

  it('returns 400 when shop is duplicate and there are more of them', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    models.shops.getByChannelShopId = sinon.spy(() => {
      return Promise.resolve([shop, shop]);
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(400);
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.shops.getById throws', () => {
    models.shops.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.shops.getByChannelShopId throws', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    models.shops.getByChannelShopId = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.shops.resetError throws', () => {
    shop.invalid = true;
    shop.sync_status = SHOP_SYNC_STATUS_DUPLICATE;
    models.shops.resetError = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.shops.resetInvalidFlag throws', () => {
    models.shops.resetInvalidFlag = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.accounts.getById throws', () => {
    models.accounts.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when rabbitClient.enqueueShopSync throws', () => {
    rabbitClient.enqueueShopSyncEtsy = sinon.stub().throws(new Error(errorMessage));
    return syncShop(undefined, models, rabbitClient, req, res).then(() => {
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });
});
