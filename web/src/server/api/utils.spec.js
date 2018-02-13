import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as Utils from './utils';

chai.use(sinonChai);

import Promise from 'bluebird';

describe('API utils', () => {
  describe('normalize', () => {
    it('Should normalize response', () => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      const res = Utils.normalize('tests', arr);
      expect(res.testsById).to.be.defined;
      expect(res.testsById[1]).to.be.defined;
      expect(res.testsById[2]).to.be.defined;
      expect(res.testsById[3]).to.be.defined;
      expect(res.tests).to.eql([1, 2, 3]);
    });

    it('Should throw error if array is not porvided', (done) => {
      try {
        Utils.normalize('tests');
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if namespace is not porvided', (done) => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      try {
        Utils.normalize(undefined, arr);
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if namespace is not text', (done) => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      try {
        Utils.normalize(132, arr);
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if object array is is not array', (done) => {
      try {
        Utils.normalize('132', 'arr');
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });
  });

  describe('normalizePartially', () => {
    it('Should normalize response', () => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      const res = Utils.normalize('tests', arr);
      expect(res.testsById).to.be.defined;
      expect(res.testsById[1]).to.be.defined;
      expect(res.testsById[2]).to.be.defined;
      expect(res.testsById[3]).to.be.defined;
      expect(res.tests).not.to.defined;
    });

    it('Should throw error if array is not porvided', (done) => {
      try {
        Utils.normalize('tests');
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if namespace is not porvided', (done) => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      try {
        Utils.normalize(undefined, arr);
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if namespace is not text', (done) => {
      const arr = [ {id: 1}, {id: 2}, {id: 3}];
      try {
        Utils.normalize(132, arr);
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });

    it('Should throw error if object array is is not array', (done) => {
      try {
        Utils.normalize('132', 'arr');
      } catch (e) {
        expect(true).to.be.truthy;
        return done();
      }
      expect(false).to.be.truthy;
      return done();
    });
  });

  describe('denorm', () => {
    let accounts;
    let channels;
    let bananas;
    let models;

    beforeEach(() => {
      accounts = [
        {
          id: 1,
          name: 'acc1'
        }, {
          id: 2,
          name: 'acc2'
        }];

      channels = [
        {
          id: 3,
          name: 'Ch1'
        }, {
          id: 4,
          name: 'Ch2'
        }];

      bananas = [
        {
          id: 5,
          name: 'B1'
        }, {
          id: 6,
          name: 'B2'
        }];

      models = {
        accounts: {
          getByIds: sinon.spy(() => Promise.resolve(accounts))
        },
        channels: {
          getByIds: sinon.spy(() => Promise.resolve(channels))
        },
        bananas: {
          getByIds: sinon.spy(() => Promise.resolve(bananas))
        }
      };
    });


    it('Should return promise', () => {
      const arr = [{account_id: 1}, {account_id: 2}];
      const response = Utils.denorm(models, 'accounts', arr);
      expect(response.then).to.be.defined;
      expect(response.catch).to.be.defined;
    });

    it('Should denorm data', (done) => {
      const arr = [{account_id: 1}, {account_id: 2}];
      Utils.denorm(models, 'accounts', arr).then(denorm => {
        expect(denorm.length).to.eql(1);
        expect(denorm[0].accountsById).to.be.defined;
        expect(denorm[0].accountsById[1]).to.be.defined;
        expect(denorm[0].accountsById[2]).to.be.defined;
        expect(denorm[0].accounts).not.to.be.defined;
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      });
    });

    it('Should denorm multiple data', (done) => {
      const arr = [{account_id: 1, channel_id: 3}, {account_id: 2, channel_id: 4}];
      Utils.denorm(models, 'accounts,channels', arr).then(denorm => {
        expect(denorm.length).to.eql(2);
        expect(denorm[0].accountsById).to.be.defined;
        expect(denorm[0].accountsById[1]).to.be.defined;
        expect(denorm[0].accountsById[2]).to.be.defined;
        expect(denorm[0].accounts).not.to.be.defined;
        expect(denorm[1].channelsById).to.be.defined;
        expect(denorm[1].channelsById[3]).to.be.defined;
        expect(denorm[1].channelsById[4]).to.be.defined;
        expect(denorm[1].channels).not.to.be.defined;
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      });
    });

    it('Should denorm all allowed data', (done) => {
      const arr = [{account_id: 1, channel_id: 3, banana_id: 5}, {account_id: 2, channel_id: 4, banana_id: 6}];
      Utils.denorm(models, 'true', arr).then(denorm => {
        expect(denorm.length).to.eql(2);
        expect(denorm[0].accountsById).to.be.defined;
        expect(denorm[0].accountsById[1]).to.be.defined;
        expect(denorm[0].accountsById[2]).to.be.defined;
        expect(denorm[0].accounts).not.to.be.defined;
        expect(denorm[1].channelsById).to.be.defined;
        expect(denorm[1].channelsById[3]).to.be.defined;
        expect(denorm[1].channelsById[4]).to.be.defined;
        expect(denorm[1].channels).not.to.be.defined;
        done();
      }, () => {
        expect(false).to.be.truthy;
      });
    });

    it('Should not denorm data', (done) => {
      const arr = [{account_id: 1}, {account_id: 2}];
      Utils.denorm(models, 'false', arr).then(denorm => {
        expect(denorm.length).to.eql(0);
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      });
    });

    it('Should throw error if model is missing', (done) => {
      const arr = [{apple_id: 1}, {apple_id: 2}];
      Utils.denorm(models, 'false', arr).then(() => {
        expect(false).to.be.truthy;
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      }).catch(() => {
        expect(true).to.be.truthy;
        done();
      });
    });

    it('Should throw error if denorm string is missing', (done) => {
      const arr = [{apple_id: 1}, {apple_id: 2}];
      Utils.denorm(models, null, arr).then(() => {
        expect(false).to.be.truthy;
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      }).catch(() => {
        expect(true).to.be.truthy;
        done();
      });
    });

    it('Should throw error if input array is missing', (done) => {
      Utils.denorm(models, 'true').then(() => {
        expect(false).to.be.truthy;
        done();
      }, () => {
        expect(false).to.be.truthy;
        done();
      }).catch(() => {
        expect(true).to.be.truthy;
        done();
      });
    });
  });
});
