import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import getUserShops from './getUserShops';

chai.use(sinonChai);

describe('API GET /admin/users/:userId', () => {
  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve({
            company_id: 8
          }))
        }
      },
      shops: {
        getByCompanyId: sinon.spy(() => Promise.resolve(['shops']))
      }
    };
    req = {
      params: {
        userId: 5
      },
      query: {}
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('model methods are called with correct ids', () => {
    return getUserShops(undefined, models, null, req, res)
      .then(() => {
        expect(models.auth.users.getById).have.been.calledOnce;
        expect(models.auth.users.getById).have.been.calledWith(5);

        expect(models.shops.getByCompanyId).have.been.calledOnce;
        expect(models.shops.getByCompanyId).have.been.calledWith(8);
      });
  });

  it('returns model result', () => {
    return getUserShops(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith(['shops']);
      });
  });

  it('returns 404 when model does not return anything (user does not exist)', () => {
    models.auth.users.getById = sinon.spy(() => Promise.resolve(null));
    return getUserShops(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(404);
    });
  });

  it('returns 500 when model auth.users.getById method throws', () => {
    const errorMessage = 'error message';
    models.auth.users.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getUserShops(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });

  it('returns 500 when model shops.getByCompanyId method throws', () => {
    const errorMessage = 'error message';
    models.shops.getByCompanyId = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getUserShops(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
