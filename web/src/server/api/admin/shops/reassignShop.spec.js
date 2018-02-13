import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';
import pgp from 'pg-promise';

import { expectResponseWasSent } from '../../../../../../test/util';
import reassignShop from './reassignShop';

chai.use(sinonChai);


describe('API GET /shops/:shopId/reassign/:userId', () => {
  const errorMessage = 'error message';

  let shop;
  let user;
  let models;
  let req;
  let res;

  beforeEach(() => {
    shop = {
      id: 5,
      account_id: 1
    };
    user = {
      id: 1,
      company_id: 10
    };
    models = {
      shops: {
        getById: sinon.spy(() => Promise.resolve(shop))
      },
      accounts: {
        updateCompanyId: sinon.spy(() => Promise.resolve())
      },
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve(user))
        }
      }
    };
    req = {
      params: {
        shopId: 5,
        userId: 1
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

  it('calls models.auth.users.getById is called with correct company id',
    () => {
      return reassignShop(undefined, models, null, req, res).then(() => {
        expect(models.auth.users.getById).to.have.been
          .calledWith(req.params.userId);
        expectResponseWasSent(res);
      });
    });

  it('calls models.shops.getById is called with correct shop id', () => {
    return reassignShop(undefined, models, null, req, res)
      .then(() => {
        expect(models.shops.getById).to.have.been.calledWith(req.params.shopId);
        expectResponseWasSent(res);
      });
  });

  it('calls models.accounts.updateCompanyId is called with correct shop and company id',
    () => {
      return reassignShop(undefined, models, null, req, res)
        .then(() => {
          expect(models.accounts.updateCompanyId).to.have.been
            .calledWith(shop.account_id, user.company_id);
          expectResponseWasSent(res);
        });
    });

  it('returns 200 when all is ok', () => {
    return reassignShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(200);
      expectResponseWasSent(res);
    });
  });

  it('returns 404 when no user with userId from URL exists', () => {
    models.auth.users.getById = sinon.spy(() => Promise.resolve());
    return reassignShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(404);
      expectResponseWasSent(res);
    });
  });

  it('returns 404 when shop with given shop id does not exist (model method throws error)',
    () => {
      models.shops.getById = sinon.spy(() => {
        return new Promise(() => {
          const err = {
            code: pgp.errors.queryResultErrorCode.noData
          };
          throw err;
        });
      });
      return reassignShop(undefined, models, null, req, res).then(() => {
        expect(res.status).to.have.been.calledWith(404);
        expectResponseWasSent(res);
      });
    });

  it('returns 500 when models.auth.users.getByCompanyId throws', () => {
    models.auth.users.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return reassignShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.shops.getById throws', () => {
    models.shops.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return reassignShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });

  it('returns 500 when models.accounts.updateCompanyId throws', () => {
    models.accounts.updateCompanyId = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return reassignShop(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({
        error: errorMessage
      });
      expectResponseWasSent(res);
    });
  });
});
