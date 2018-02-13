import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

describe('API GET /users/current', () => {
  let userProfile;
  let shops;
  let channel;
  let models;
  let req;
  let res;

  beforeEach( () => {
    userProfile = { last_seen_shop: 1, test: 'data' };
    shops = { shops: [] };
    channel = { NAME: 'etsy' };
  });

  beforeEach( () => {
    models = {
      userProfiles: {
        getById: sinon.spy(() => Promise.resolve(userProfile))
      },
      shops: {
        getById: sinon.stub(),
        getByCompanyId: sinon.spy(() => Promise.resolve(shops))
      },
      channels: {
        getById: sinon.spy(() => Promise.resolve(channel))
      },
      constants: {
        SHOP_SYNC_STATUS_UPTODATE: 'uptodate',
        SHOP_SYNC_STATUS_INCOMPLETE: 'incomplete',
        SYNC: 'sync'
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1
      },
      params: {}
    };

    res = {
      json: sinon.spy()
    };
  });

  it('should get route handler', () => {
    const userProfilesGetter = require('./getUserProfile');
    expect(_.isFunction(userProfilesGetter)).to.be.true;
  });

  it('should return user profile for "current" user', () => {
    const userProfilesGetter = require('./getUserProfile');
    models.shops.getById.returns(Promise.resolve({ some: 'shop data' }));

    return userProfilesGetter({}, models, null, req, res).then(() => {
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(models.userProfiles.getById).to.have.been.calledWith(req.session.userId);
      expect(models.shops.getByCompanyId).not.to.have.been.called;
      expect(res.json).to.have.been.calledOnce;
      expect(res.json.args[0][0]).to.be.eql({ last_seen_shop: { some: 'shop data' }, test: 'data' });
    });
  });

  it('should return user profile without last seen shop', () => {
    delete userProfile.last_seen_shop;
    const userProfilesGetter = require('./getUserProfile');

    res.check = (params) => {
      expect(models.shops.getById).not.to.have.been.called;
      expect(models.userProfiles.getById).to.have.been.calledWith(req.session.userId);
      expect(models.shops.getByCompanyId).not.to.have.been.called;
      expect(params).to.be.eql({ test: 'data' });
    };

    return userProfilesGetter({}, models, null, req, res).then(() => {
      expect(models.shops.getById).not.to.have.been.called;
      expect(models.userProfiles.getById).to.have.been.calledWith(req.session.userId);
      expect(models.shops.getByCompanyId).not.to.have.been.called;
      expect(res.json).to.have.been.calledOnce;
      expect(res.json.args[0][0]).to.be.eql({ test: 'data' });
    });
  });

  it('should catch errors', () => {
    const userProfilesGetter = require('./getUserProfile');
    models.shops.getById = sinon.spy(() => {
      return new Promise(() => {
        throw new Error('error message');
      });
    });

    return userProfilesGetter({}, models, null, req, res).then(() => {
      expect(res.json).to.have.been.called;
      expect(res.json.args[0][0]).to.be.eql({ error: 'error message' });
    });
  });
});
