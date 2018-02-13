import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import getUserById from './getUserById';

chai.use(sinonChai);

describe('API GET /admin/users/:userId', () => {
  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve('result'))
        }
      }
    };
    req = {
      params: {
        userId: 5
      }
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('model method is called with correct id', () => {
    return getUserById(undefined, models, null, req, res)
      .then(() => {
        expect(models.auth.users.getById).have.been.calledOnce;
        expect(models.auth.users.getById).have.been.calledWith(5);
      });
  });

  it('returns model result', () => {
    return getUserById(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith('result');
      });
  });

  it('returns 404 when model does not return anything (user does not exist)', () => {
    models.auth.users.getById = sinon.spy(() => Promise.resolve(null));
    return getUserById(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(404);
    });
  });

  it('returns 500 when model method throws', () => {
    const errorMessage = 'error message';
    models.auth.users.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getUserById(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
