import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import searchUsers from './searchUsers';

chai.use(sinonChai);

describe('API GET /admin/users/search', () => {
  let models;
  let req;
  let res;

  beforeEach(() => {
    models = {
      auth: {
        users: {
          searchUsers: sinon.spy(() => Promise.resolve('result'))
        }
      }
    };
    req = {
      query: {}
    };
    const jsonSpy = sinon.spy();
    const statusStub = sinon.stub().returns({ json: jsonSpy });
    res = {
      json: jsonSpy,
      status: statusStub
    };
  });

  it('model search method is called with correct query', () => {
    req.query.query = 'actual query';
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(models.auth.users.searchUsers).to.have.been.calledWith(req.query.query);
      });
  });

  it('returns empty array when query is not provided', () => {
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith([]);
      });
  });

  it('returns empty array when empty query is provided', () => {
    req.query.query = '';
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith([]);
      });
  });

  it('returns model result when non empty query is provided', () => {
    req.query.query = 'actual query';
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith('result');
      });
  });

  it('returns model result when query is a number 0', () => {
    req.query.query = 0;
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith('result');
      });
  });

  it('returns model result when query is a non-zero number', () => {
    req.query.query = 1;
    return searchUsers(undefined, models, null, req, res)
      .then(() => {
        expect(res.json).to.have.been.calledWith('result');
      });
  });

  it('returns 500 when model method throws', () => {
    const errorMessage = 'error message';
    models.auth.users.searchUsers = sinon.spy(() => {
      return new Promise(() => {
        throw new Error(errorMessage);
      });
    });
    req.query.query = 'actual query';
    return searchUsers(undefined, models, null, req, res).then(() => {
      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ error: errorMessage });
    });
  });
});
