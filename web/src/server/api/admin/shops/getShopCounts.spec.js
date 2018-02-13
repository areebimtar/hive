import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import getShopCounts from './getShopCounts';

chai.use(sinonChai);

describe('API GET /admin/shops/counts', () => {
  let models;
  let res;

  beforeEach(() => {
    models = {
      shops: {
        getShopCount: sinon.spy(() => Promise.resolve(15)),
        getEtsyShopCount: sinon.spy(() => Promise.resolve(12))
      }
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('returns values from model when it returns ints', () => {
    return getShopCounts(undefined, models, null, undefined, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith({
          userShops: 15,
          etsyShops: 12
        });
      });
  });

  it('returns values from model when it returns strings', () => {
    models.shops = {
      getShopCount: sinon.spy(() => Promise.resolve('15')),
      getEtsyShopCount: sinon.spy(() => Promise.resolve('12'))
    };

    return getShopCounts(undefined, models, null, undefined, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith({
          userShops: 15,
          etsyShops: 12
        });
      });
  });

  it('returns 500 when model shops.getShopCount throws', () => {
    const errorMessage = 'error message';
    models.shops.getShopCount = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getShopCounts(undefined, models, null, undefined, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });

  it('returns 500 when model shops.getEtsyShopCount throws', () => {
    const errorMessage = 'error message';
    models.shops.getEtsyShopCount = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getShopCounts(undefined, models, null, undefined, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });

  it('returns 500 when model both model methods throw', () => {
    const errorMessage = 'error message';
    models.shops = {
      getShopCount: sinon.spy(() => {
        return new Promise(() => {
          throw new Error(errorMessage);
        });
      }),
      getEtsyShopCount: sinon.spy(() => {
        return new Promise(() => {
          throw new Error(errorMessage);
        });
      })
    };
    return getShopCounts(undefined, models, null, undefined, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
