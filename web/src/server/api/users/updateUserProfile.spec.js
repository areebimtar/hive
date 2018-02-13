import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import updateUserProfile from './updateUserProfile';

chai.use(sinonChai);

import Promise from 'bluebird';

describe('API PUT /users/', () => {
  let userProfile;
  let models;
  let req;
  let res;

  beforeEach( () => {
    userProfile = { last_seen_shop: { id: 1, channel: 'etsy' } };
  });

  beforeEach( () => {
    models = {
      userProfiles: {
        getById: sinon.spy(() => Promise.resolve(userProfile)),
        update: sinon.spy(() => Promise.resolve())
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1
      },
      params: {
      },
      body: null
    };

    res = {
      json(params) { res.check(params); }
    };
  });


  it('should update user profile for "current" user', (done) => {
    res.check = (params) => {
      expect(models.userProfiles.getById).to.not.be.called;
      expect(models.userProfiles.update).to.have.been.calledWith(req.session.userId, {showIntroVideo: 'false'});
      expect(params).to.be.eql({result: 'success'});
      done();
    };

    req.body = {showIntroVideo: 'false'};
    updateUserProfile({}, models, null, req, res);
  });

  it('should fail if body is not provided', (done) => {
    res.check = (params) => {
      expect(models.userProfiles.getById).to.not.be.called;
      expect(models.userProfiles.update).to.not.be.called;
      expect(params).to.be.eql({error: 'Invalid request'});
      done();
    };

    // req.body = {'showIntroVideo': false};
    updateUserProfile({}, models, null, req, res);
  });
});
