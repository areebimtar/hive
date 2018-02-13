import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

describe('API GET /shops', () => {
  let accounts;
  let channels;
  let shops;
  let count;
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
      }, {
        id: 2,
        company_id: 1,
        channel_id: 2,
        title: 'account_2'
      }];

    channels = [
      {
        id: 1,
        name: 'etsy'
      }, {
        id: 2,
        name: 'shopify'
      }];

    shops = [
      {
        id: 1,
        name: 'shop_1',
        account_id: 1,
        channel_id: 1
      }, {
        id: 2,
        name: 'shop_2',
        account_id: 2,
        channel_id: 2
      }];

    count = {
      count: 2
    };
  });

  beforeEach( () => {
    models = {
      db1: {
        accounts: {
          getByIds: sinon.spy(() => Promise.resolve(accounts))
        },
        channels: {
          getByIds: sinon.spy(() => Promise.resolve(channels))
        },
        shops: {
          getByCompanyId: sinon.spy(() => Promise.resolve(shops)),
          getByCompanyIdCount: sinon.spy(() => Promise.resolve(count))
        }
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1,
        db: 'db1'
      },
      query: {
        denorm: undefined
      }
    };

    res = {
      json(params) { res.check(params); }
    };
  });

  it('should get route handler', () => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;
  });

  it('should get shops by companyId', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledWith(1);
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      done();
    };
    routeHandler(req, res);
  });

  it('should get shops and denorm accounts', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.accountsById[2]).to.eql(accounts[1]);
      done();
    };

    req.query.denorm = 'accounts';
    routeHandler(req, res);
  });

  it('should get shops and denorm channels', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.channelsById[1]).to.eql(channels[0]);
      expect(params.channelsById[2]).to.eql(channels[1]);
      done();
    };

    req.query.denorm = 'channels';
    routeHandler(req, res);
  });

  it('should get shops and denorm accounts and channels', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.accountsById[2]).to.eql(accounts[1]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      expect(params.channelsById[2]).to.eql(channels[1]);
      done();
    };

    req.query.denorm = 'accounts,channels';
    routeHandler(req, res);
  });

  it('should get shops and denorm accounts and channels (reverse order)', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.accountsById[2]).to.eql(accounts[1]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      expect(params.channelsById[2]).to.eql(channels[1]);
      done();
    };

    req.query.denorm = 'channels,accounts';
    routeHandler(req, res);
  });

  it('should get shops and be case insensitive with denorm param', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.accountsById[2]).to.eql(accounts[1]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      expect(params.channelsById[2]).to.eql(channels[1]);
      done();
    };

    req.query.denorm = 'aCcOuNts,chAnnEls';
    routeHandler(req, res);
  });

  it('should get shops and denorm all', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      expect(params.accountsById[1]).to.eql(accounts[0]);
      expect(params.accountsById[2]).to.eql(accounts[1]);
      expect(params.channelsById[1]).to.eql(channels[0]);
      expect(params.channelsById[2]).to.eql(channels[1]);
      done();
    };

    req.query.denorm = 'true';
    routeHandler(req, res);
  });

  it('should get shops and denorm none', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1, 2]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.shopsById[2]).to.eql(shops[1]);
      expect(params.count).to.eql(count.count);
      done();
    };

    req.query.denorm = 'false';
    routeHandler(req, res);
  });

  it('should get shops limited by param', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    shops.splice(1, 1);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledWithExactly(1, undefined, 1);
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([1]);
      expect(params.shopsById[1]).to.eql(shops[0]);
      expect(params.count).to.eql(count.count);
      done();
    };

    req.query.limit = '1';
    routeHandler(req, res);
  });

  it('should get shops with offset param', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    shops.splice(0, 1);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledWithExactly(1, 1, undefined);
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([2]);
      expect(params.shopsById[2]).to.eql(shops[0]);
      expect(params.count).to.eql(count.count);
      done();
    };

    req.query.offset = '1';
    routeHandler(req, res);
  });

  it('should get shops with limit and offset params', (done) => {
    const shopsGetter = require('./get');
    expect(_.isFunction(shopsGetter)).to.be.true;

    const routeHandler = shopsGetter({}, models);

    shops.splice(0, 1);

    res.check = (params) => {
      expect(models.db1.accounts.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.channels.getByIds).not.to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledOnce;
      expect(models.db1.shops.getByCompanyId).to.have.been.calledWithExactly(1, 1, 1);
      expect(models.db1.shops.getByCompanyIdCount).to.have.been.calledOnce;
      expect(params.shops).to.eql([2]);
      expect(params.shopsById[2]).to.eql(shops[0]);
      expect(params.count).to.eql(count.count);
      done();
    };

    req.query.limit = '1';
    req.query.offset = '1';
    routeHandler(req, res);
  });
});
