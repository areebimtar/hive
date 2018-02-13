import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { FIELDS } from 'global/modules/etsy/constants';

import routeHandler from './get';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

import module from './get';

const SHOP_ID = 10;

describe('API GET /shops/:shopId/products', () => {
  let products;
  let productsCount;
  let shops;
  let images;
  let models;
  let req;
  let res;

  beforeEach( () => {
    products = [
      {
        id: 1,
        title: 'product 1',
        description: 'desc 1',
        tags: ['a', 'b'],
        shop_id: SHOP_ID,
        [FIELDS.PHOTOS]: ['1']
      }, {
        id: 2,
        title: 'product 2',
        description: 'desc 2',
        tags: ['b'],
        shop_id: SHOP_ID,
        [FIELDS.PHOTOS]: ['2']
      }];

    productsCount = {
      count: 2
    };

    shops = [
      {
        id: SHOP_ID,
        name: 'test shop'
      }
    ];

    images = [
      { id: '1', thumbnail_url: 'url 1', fullsize_url: 'url 1 fullsize' },
      { id: '2', thumbnail_url: 'url 2', fullsize_url: 'url 2 fullsize' }
    ];
  });

  beforeEach( () => {
    models = {
      products: {
        getAll: sinon.spy(() => Promise.resolve(products)),
        getAllCount: sinon.spy(() => Promise.resolve(productsCount))
      },
      shops: {
        getByIds: sinon.spy(() => Promise.resolve(shops))
      },
      images: {
        getByIds: sinon.spy(() => Promise.resolve(images))
      },
      attributes: {
        getByProductIds: sinon.stub().returns([])
      },
      productVariations: {
        getByProductIdsWithOptions: sinon.stub().returns([])
      },
      productOfferings: {
        getByProductIds: sinon.stub().returns([])
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1
      },
      query: {
        denorm: undefined,
        id: [1]
      },
      params: {
        shopId: SHOP_ID
      }
    };

    res = {
      json(params) { res.check(params); }
    };
  });

  it('should get route handler', () => {
    const allProductsGetter = require('./get');
    expect(_.isFunction(allProductsGetter)).to.be.true;
  });

  it('should get products', () => {
    res.check = (params) => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], undefined, undefined);
      expect(params.products).to.eql([1, 2]);
      expect(params.productsById[1]).to.eql(products[0]);
      expect(params.productsById[2]).to.eql(products[1]);
      expect(params.count).to.eql(productsCount.count);
    };

    return routeHandler({}, models, null, req, res);
  });

  it('should pass offset and limit', () => {
    const offset = 13;
    const limit = 5;
    res.check = () => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], offset, limit);
    };

    req.query.offset = offset;
    req.query.limit = limit;
    return routeHandler({}, models, null, req, res);
  });

  it('should denorm shops', () => {
    res.check = () => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], undefined, undefined);
      expect(models.shops.getByIds).to.have.been.calledWith([SHOP_ID]);
    };

    req.query.denorm = 'shops';
    return routeHandler({}, models, null, req, res);
  });

  it('should denorm all', () => {
    res.check = () => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], undefined, undefined);
      expect(models.shops.getByIds).to.have.been.calledWithExactly([SHOP_ID]);
    };

    req.query.denorm = 'true';
    return routeHandler({}, models, null, req, res);
  });

  it('should be case insensitive with denorm param', () => {
    res.check = () => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], undefined, undefined);
      expect(models.shops.getByIds).to.have.been.calledWithExactly([SHOP_ID]);
    };

    req.query.denorm = 'ShOpS';
    return routeHandler({}, models, null, req, res);
  });

  it('should get shops and denorm none', () => {
    res.check = () => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1], undefined, undefined);
      expect(models.shops.getByIds).not.to.have.been.called;
    };

    req.query.denorm = 'false';
    return routeHandler({}, models, null, req, res);
  });

  it('should get only products spefified in "id" query param', () => {
    res.check = (params) => {
      expect(models.products.getAll).to.have.been.calledWithExactly([1, 2], undefined, undefined);
      expect(params.products).to.eql([1, 2]);
      expect(params.productsById[1]).to.eql(products[0]);
      expect(params.productsById[2]).to.eql(products[1]);
      expect(params.count).to.eql(productsCount.count);
    };
    req.query.id = [1, 2];
    return routeHandler({}, models, null, req, res);
  });

  it('should get images data', () => {
    res.check = (params) => {
      expect(params.imagesById).to.eql({ 1: { id: '1', thumbnail_url: 'url 1', fullsize_url: 'url 1 fullsize' }, 2: { id: '2', thumbnail_url: 'url 2', fullsize_url: 'url 2 fullsize' } });
    };
    req.query.id = [1];
    return routeHandler({}, models, null, req, res);
  });
});

describe('sortProductOfferings', () => {
  let sortProductOfferings;
  let variations;
  let offerings;
  let result;

  beforeEach(() => {
    variations = {
      1: { first: false, id: '1' },
      2: { first: true, id: '2' }
    };

    offerings = [
      { id: 8, variationOptions: [{variationId: '1', sequence: 2}, {variationId: '2', sequence: 2}] },
      { id: 6, variationOptions: [{variationId: '1', sequence: 0}, {variationId: '2', sequence: 2}] },
      { id: 7, variationOptions: [{variationId: '1', sequence: 1}, {variationId: '2', sequence: 2}] },
      { id: 2, variationOptions: [{variationId: '1', sequence: 2}, {variationId: '2', sequence: 0}] },
      { id: 0, variationOptions: [{variationId: '1', sequence: 0}, {variationId: '2', sequence: 0}] },
      { id: 1, variationOptions: [{variationId: '1', sequence: 1}, {variationId: '2', sequence: 0}] },
      { id: 5, variationOptions: [{variationId: '1', sequence: 2}, {variationId: '2', sequence: 1}] },
      { id: 3, variationOptions: [{variationId: '1', sequence: 0}, {variationId: '2', sequence: 1}] },
      { id: 4, variationOptions: [{variationId: '1', sequence: 1}, {variationId: '2', sequence: 1}] }
    ];

    sortProductOfferings = module.__get__('sortProductOfferings');

    result = sortProductOfferings(variations, offerings);
  });

  it('should swap offering options', () => {
    _.each(result, offering => {
      expect(offering.variationOptions[0].variationId).to.eql('2');
      expect(offering.variationOptions[1].variationId).to.eql('1');
    });
  });

  it('should sort offerings', () => {
    _.each(result, (offering, index) => {
      expect(offering.id).to.eql(index);
    });
  });
});
