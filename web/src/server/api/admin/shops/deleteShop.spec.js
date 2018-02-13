import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import deleteShop from './deleteShop';

chai.use(sinonChai);

describe('API DELETE /admin/shops/:shopId', () => {
  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      shops: {
        deleteById: sinon.spy(() => Promise.resolve('result'))
      }
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    req = {
      params: {
        shopId: 5
      }
    };
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('model method is called with correct id', () => {
    return deleteShop(undefined, models, null, req, res)
      .then(() => {
        expect(models.shops.deleteById).have.been.calledOnce;
        expect(models.shops.deleteById).have.been.calledWith(5);
      });
  });

  it('returns 200 when model returns value', () => {
    return deleteShop(undefined, models, null, req, res)
      .then(() => {
        expect(res.status).to.have.been.calledWith(200);
      });
  });

  it('returns 500 when model throws', () => {
    const errorMessage = 'error message';
    models.shops = {
      deleteById: sinon.spy(() => {
        return new Promise(() => {
          throw new Error(errorMessage);
        });
      })
    };

    return deleteShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
