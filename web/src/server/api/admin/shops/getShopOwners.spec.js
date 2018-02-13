import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import getShopOwners from './getShopOwners';

chai.use(sinonChai);

describe('API GET /admin/shops/:shopId/owners', () => {
  const shop = {
    account_id: '1'
  };
  const account = {
    id: '1',
    company_id: '1'
  };
  const shopOwner = {
    id: '1',
    company_id: '1',
    email: 'email'
  };

  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      shops: {
        getById: sinon.spy(() => Promise.resolve(shop))
      },
      accounts: {
        getByIds: sinon.spy(() => Promise.resolve([account]))
      },
      auth: {
        users: {
          getByCompanyId: sinon.spy(() => Promise.resolve([shopOwner]))
        }
      }
    };
    req = {
      params: {
        shopId: '1'
      }
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('returns shop owner', () => {
    return getShopOwners(undefined, models, null, req, res)
      .then(() => {
        expect(models.shops.getById).to.have.been.calledWith('1');
        expect(models.accounts.getByIds).to.have.been.calledWith([1]);
        expect(models.auth.users.getByCompanyId).to.have.been.calledWith('1');
        expect(res.json).to.have.been.calledWith([shopOwner]);
      });
  });

  it('catches error in shops.getById', () => {
    const errorMessage = 'error message';
    models.shops.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getShopOwners(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });

  it('catches error in accounts.getByIds', () => {
    const errorMessage = 'error message';
    models.accounts.getByIds = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getShopOwners(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });

  it('catches error in auth.users.getByCompanyId', () => {
    const errorMessage = 'error message';
    models.auth.users.getByCompanyId = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getShopOwners(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
