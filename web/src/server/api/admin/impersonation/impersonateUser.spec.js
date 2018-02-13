import _ from 'lodash';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import { expectResponseWasSent } from '../../../../../../test/util';

import impersonateUser from './impersonateUser';

chai.use(sinonChai);

describe('API GET /admin/impersonation/impersonate/:userId', () => {
  let config;
  let models;
  let req;
  let res;

  beforeEach(() => {
    config = {};
    models = {
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve({
            company_id: 8
          }))
        }
      }
    };
    req = {
      params: {
        userId: 5
      },
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
      cookie: sinon.spy(),
      json: jsonSpy,
      status: statusStub,
      sendSpy,
      removeHeader: _.noop
    };
  });

  it('returns 200', () => {
    return impersonateUser(config, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(res.status).to.have.been.calledOnce;
        expect(res.status).to.have.been.calledWith(200);
      });
  });

  it('model methods are called with correct ids', () => {
    return impersonateUser(config, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(models.auth.users.getById).have.been.calledTwice;
        expect(models.auth.users.getById).have.been.calledWith(5);
        expect(models.auth.users.getById).have.been.calledWith(6);
      });
  });

  it('returns 400 when admin is the user', () => {
    req.session.userId = 5;
    return impersonateUser(config, models, null, req, res)
      .then(() => {
        expectResponseWasSent(res);
        expect(res.status).to.have.been.calledOnce;
        expect(res.status).to.have.been.calledWith(400);
        expect(res.json).to.have.been.calledOnce;
      });
  });

  it('returns 404 when model does not return anything (user does not exist)', () => {
    models.auth.users.getById = sinon.spy(() => Promise.resolve());
    return impersonateUser(config, models, null, req, res).then(() => {
      expectResponseWasSent(res);
      expect(res.status).to.have.been.calledOnce;
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
    return impersonateUser(config, models, null, req, res).then(() => {
      expectResponseWasSent(res);
      expect(res.status).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledOnce;
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
