import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

describe('API GET /shops/:id/sections', () => {
  let models;
  let sections;
  let req;
  let res;

  beforeEach( () => {
    sections = {
      ids: [1, 2, 3],
      1: {value: 'section 1'},
      2: {value: 'section 2'},
      3: {value: 'section 3'},
      shopId: 2
    };
  });

  beforeEach( () => {
    models = {
      sections: {
        getSections: sinon.spy(() => Promise.resolve(sections))
      }
    };

    req = {
      params: {
        shopId: 2
      }
    };

    res = {
      json(params) { res.check(params); }
    };
  });

  it('should get route handler', () => {
    const routeHandler = require('./getSections');
    expect(_.isFunction(routeHandler)).to.be.true;
  });

  it('should get sections by shopId', (done) => {
    const routeHandler = require('./getSections');

    res.check = (params) => {
      expect(models.sections.getSections).to.have.been.calledWith(2);
      expect(params.ids).to.eql([1, 2, 3]);
      expect(params[1]).to.eql('section 1');
      expect(params[2]).to.eql('section 2');
      expect(params[3]).to.eql('section 3');
      expect(params.shopId).to.eql(2);
      done();
    };
    routeHandler({}, models, null, req, res);
  });
});
