import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import { expectResponseWasSent } from '../../../../../test/util';

import getUserInfo from './getUserInfo';

chai.use(sinonChai);

describe('API GET /admin/userInfo', () => {
  const user = {
    id: 5
  };
  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve(user))
        }
      }
    };
    req = {
      session: {
        userId: 6
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

  it('returns 200', () => {
    return getUserInfo(undefined, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(res.status).to.have.been.calledOnce;
        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledOnce;
        expect(res.json).to.have.been.calledWith(user);
      });
  });

  it('models.auth.users.getById is called with correct id when not impersonating', () => {
    return getUserInfo(undefined, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(models.auth.users.getById).have.been.calledOnce;
        expect(models.auth.users.getById).have.been.calledWith(6);
      });
  });

  it('models.auth.users.getById is called with correct id when impersonating', () => {
    req.session.impersonating = true;
    req.session.originalUser = { id: '8' };
    return getUserInfo(undefined, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(models.auth.users.getById).have.been.calledOnce;
        expect(models.auth.users.getById).have.been.calledWith('8');
      });
  });

  it('returns 404 when model does not return anything (user does not exist)', () => {
    models.auth.users.getById = sinon.spy(() => Promise.resolve());
    return getUserInfo(undefined, models, null, req, res).then(() => {
      expectResponseWasSent(res);
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(404);
    });
  });

  it('returns 500 when models.auth.users.getById method throws', () => {
    const errorMessage = 'error message';
    models.auth.users.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    return getUserInfo(undefined, models, null, req, res).then(() => {
      expectResponseWasSent(res);
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledOnce;
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
