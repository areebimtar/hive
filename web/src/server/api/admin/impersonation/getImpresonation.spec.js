import _ from 'lodash';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import getImpresonation from './getImpresonation';

chai.use(sinonChai);

describe('API GET /admin/impersonation', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        userId: 5
      },
      session: {
        userId: 6,
        email: 'user@email',
        impersonating: true,
        originalUser: { id: '1' },
        db: 'db1'
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

  it('returns proper response when impersonating', () => {
    getImpresonation({}, null, null, req, res);

    expect(res.status).to.have.been.calledOnce;
    expect(res.status).to.have.been.calledWith(200);
    expect(res.json).to.have.been.calledOnce;
    expect(res.json).to.have.been.calledWith({
      impersonating: true,
      email: 'user@email'
    });
  });

  it('returns proper response when impersonating', () => {
    delete req.session.impersonating;
    delete req.session.originalUser;
    getImpresonation({}, null, null, req, res);

    expect(res.status).to.have.been.calledOnce;
    expect(res.status).to.have.been.calledWith(200);
    expect(res.json).to.have.been.calledOnce;
    expect(res.json).to.have.been.calledWith({
      impersonating: false
    });
  });
});
