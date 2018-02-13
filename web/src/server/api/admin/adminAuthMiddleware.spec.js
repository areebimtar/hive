import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import adminAuthMiddleware from './adminAuthMiddleware';

chai.use(sinonChai);

describe('adminAuthMiddleware', () => {
  function runMiddleware(session, isAdmin, errorHandler, next) {
    const dbModels = {
      db1: {
        auth: {
          users: {
            isAdmin
          }
        }
      }
    };
    const mockLogger = { debug: sinon.stub() };
    return adminAuthMiddleware(undefined, dbModels, mockLogger, errorHandler)({ session }, undefined, next);
  }

  it('succeeds for admins', () => {
    const next = sinon.spy();
    const errorHandler = sinon.spy();
    const isAdmin = () => Promise.resolve(true);
    const session = {
      userId: 1,
      db: 'db1'
    };
    return runMiddleware(session, isAdmin, errorHandler, next)
      .then(() => {
        expect(next).to.have.been.calledOnce;
        expect(errorHandler).to.not.have.been.called;
      });
  });

  it('fails for non-admins', () => {
    const next = sinon.spy();
    const errorHandler = sinon.spy();
    const isAdmin = () => Promise.resolve(false);
    const session = {
      userId: 1,
      db: 'db1'
    };
    return runMiddleware(session, isAdmin, errorHandler, next)
      .then(() => {
        expect(next).to.not.have.been.called;
        expect(errorHandler).to.have.been.calledOnce;
      });
  });

  it('calls error handler when isAdmin throws error', () => {
    // This happens when admin state is requested for non existing user id
    const next = sinon.spy();
    const errorHandler = sinon.spy();
    const isAdmin = () => Promise.resolve().then(() => { throw new Error('Error while retrieving user admin state'); });
    const session = {
      userId: 1,
      db: 'db1'
    };
    return runMiddleware(session, isAdmin, errorHandler, next)
      .then(() => {
        expect(next).to.not.have.been.called;
        expect(errorHandler).to.have.been.calledOnce;
      });
  });
});
