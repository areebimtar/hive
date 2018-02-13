import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

describe('API GET /shops/:shopId', () => {
  let accounts;
  let channels;
  let shop;
  let models;
  let req;
  let res;

  beforeEach( () => {
    accounts = [
      {
        id: 1,
        company_id: 1,
        channel_id: 1,
        title: 'account_1',
        test_k: 'test_v'
      }];

    channels = [
      {
        id: 1,
        name: 'etsy'
      }];

    shop = {
      id: 1,
      name: 'shop_1',
      account_id: 1,
      channel_id: 1
    };
  });

  beforeEach( () => {
    models = {
      accounts: {
        getByIds: sinon.spy(() => Promise.resolve(accounts))
      },
      channels: {
        getByIds: sinon.spy(() => Promise.resolve(channels))
      },
      shops: {
        getById: sinon.spy(() => Promise.resolve(shop))
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1
      },
      query: {
        denorm: undefined
      },
      params: {
        shopId: 1
      }
    };

    res = {
      json(params) { res.check(params); }
    };
  });

  it('should get route handler', () => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;
  });

  it('should get shop by shopId', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.eql(shop);
      done();
    };
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm accounts', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).to.have.been.calledOnce;
      expect(models.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      done();
    };

    req.query.denorm = 'accounts';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm channels', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.channels.getByIds).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.channelsById[1]).to.eql(channels[0]);
      done();
    };

    req.query.denorm = 'channels';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm accounts and channels', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).to.have.been.calledOnce;
      expect(models.channels.getByIds).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      done();
    };

    req.query.denorm = 'accounts,channels';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm accounts and channels (reverse order)', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).to.have.been.calledOnce;
      expect(models.channels.getByIds).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      done();
    };

    req.query.denorm = 'channels,accounts';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and be case insensitive with denorm param', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).to.have.been.calledOnce;
      expect(models.channels.getByIds).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      done();
    };

    req.query.denorm = 'aCcOuNts,chAnnEls';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm all', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).to.have.been.calledOnce;
      expect(models.channels.getByIds).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      done();
    };

    req.query.denorm = 'true';
    shopsGetter({}, models, null, req, res);
  });

  it('should get shop and denorm none', (done) => {
    const shopsGetter = require('./getShopById');
    expect(_.isFunction(shopsGetter)).to.be.true;

    res.check = (params) => {
      expect(models.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWith(1);
      expect(params).to.be.object;
      expect(params.id).to.eql(shop.id);
      expect(params.accountsById).not.to.defined;
      expect(params.channelsById).not.to.defined;
      done();
    };

    req.query.denorm = 'false';
    shopsGetter({}, models, null, req, res);
  });
});
