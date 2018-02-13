import _ from 'lodash';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import { expectResponseWasSent } from '../../../../../../test/util';

import cancelImpersonation from './cancelImpersonation';

chai.use(sinonChai);

describe('API GET /admin/impersonation/cancel', () => {
  let config;
  let models;
  let req;
  let res;
  let next;

  beforeEach(() => {
    config = {
      webUrl: 'url'
    };
    models = {
      auth: {
        users: {
          getById: sinon.spy(() => Promise.resolve({
            id: '5',
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
        userId: 6,
        impersonating: true,
        originalUser: { id: '5', company_id: 8 }
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
    next = sinon.spy();
  });

  it('returns 400 when user is not impersonating', () => {
    delete req.session.impersonating;
    delete req.session.originalUser;
    return cancelImpersonation(config, models, null, req, res, next)
      .then(() => {
        expectResponseWasSent(res);
        expect(res.status).to.have.been.calledOnce;
        expect(res.status).to.have.been.calledWith(400);
      });
  });

  it('sets session on request object when all goes well', () => {
    return cancelImpersonation(config, models, null, req, res, next)
      .then(() => {
        expectResponseWasSent(res);
        expect(req.session.userId).to.eql('5');
      });
  });

  it('calls next when all goes well', () => {
    return cancelImpersonation(config, models, null, req, res, next)
      .then(() => {
        expectResponseWasSent(res);
        expect(res.status).to.have.been.calledOnce;
        expect(res.status).to.have.been.calledWith(200);
      });
  });
});
