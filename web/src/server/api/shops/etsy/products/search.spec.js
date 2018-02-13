import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import _ from 'lodash';
import Promise from 'bluebird';

import routeHandler from './search';

const SHOP_ID = 10;

describe('API GET /shops/:shopId/products/search', () => {
  let products;
  let productArray;
  let productsCount;
  let productsFilters;
  let statusCounut;
  let userProfile;
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
        shop_id: SHOP_ID
      }, {
        id: 2,
        title: 'product 2',
        description: 'desc 2',
        tags: ['b'],
        shop_id: SHOP_ID
      }];
    productArray = [];

    productsCount = {
      count: 2
    };

    productsFilters = {
      filters: {
        tags: {
          a: 1,
          b: 2
        }
      }
    };

    shops = [
      {
        id: SHOP_ID,
        name: 'test shop'
      }
    ];

    statusCounut = {
      statusCount: {
        edit: 2
      }
    };

    userProfile = {};

    images = [];
  });

  beforeEach( () => {
    models = {
      products: {
        getFiltered: sinon.spy(() => Promise.resolve(products)),
        getFilteredCount: sinon.spy(() => Promise.resolve(productsCount)),
        getFilteredFilters: sinon.spy(() => Promise.resolve(productsFilters)),
        getStatesCounts: sinon.spy(() => Promise.resolve(statusCounut)),
        getFilteredOnlyIds: sinon.spy(() => Promise.resolve(productArray))
      },
      productVariations: {
        getByProductIdsWithOptions: sinon.spy(() => Promise.resolve([]))
      },
      shops: {
        getByIds: sinon.spy(() => Promise.resolve(shops))
      },
      userProfiles: {
        update: sinon.spy(() => Promise.resolve(userProfile))
      },
      images: {
        getByIds: sinon.spy(() => Promise.resolve(images))
      }
    };

    req = {
      session: {
        userId: 10,
        companyId: 1
      },
      body: {
        denorm: undefined,
        fields: undefined
      },
      params: {
        shopId: SHOP_ID
      }
    };

    res = {
      json: sinon.spy()
    };
  });

  it('should get route handler', () => {
    expect(_.isFunction(routeHandler)).to.be.true;
  });

  it('should update last seen shop in user profile', async () => {
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(res.json.args[0][0].products).to.eql([1, 2]);
    expect(res.json.args[0][0].productsById[1]).to.eql(products[0]);
    expect(res.json.args[0][0].productsById[2]).to.eql(products[1]);
    expect(res.json.args[0][0].count).to.eql(productsCount.count);
    expect(res.json.args[0][0].filters).to.eql(productsFilters.filters);
  });

  it('should get products', async () => {
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(res.json.args[0][0].products).to.eql([1, 2]);
    expect(res.json.args[0][0].productsById[1]).to.eql(products[0]);
    expect(res.json.args[0][0].productsById[2]).to.eql(products[1]);
    expect(res.json.args[0][0].count).to.eql(productsCount.count);
    expect(res.json.args[0][0].filters).to.eql(productsFilters.filters);
  });

  it('should pass filters', async () => {
    const filters = {
      a: 'a',
      b: 'b',
      c: 'c'
    };

    req.body = filters;
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, filters);
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, filters);
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, filters);
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
  });

  it('should pass offset and limit', async () => {
    const offset = 13;
    const limit = 5;

    req.body.offset = offset;
    req.body.limit = limit;

    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, offset, limit, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
  });

  it('should pass offset and limit and filters', async () => {
    const offset = 13;
    const limit = 5;
    const filters = { a: 'a', b: 'b', c: 'c' };

    req.body = {
      offset: offset,
      limit: limit,
      ...filters
    };

    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, offset, limit, undefined, filters);
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, filters);
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, filters);
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
  });

  it('should pass fields', async () => {
    const fields = ['a', 'b', 'c'];

    req.body.fields = fields;

    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, fields, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
  });

  it('should denorm shops', async () => {
    req.body.denorm = 'shops';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(models.shops.getByIds).to.have.been.calledWith([SHOP_ID]);
  });

  it('should denorm all', async () => {
    req.body.denorm = 'true';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(models.shops.getByIds).to.have.been.calledWithExactly([SHOP_ID]);
  });

  it('should be case insensitive with denorm param', async () => {
    req.body.denorm = 'ShOpS';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(models.shops.getByIds).to.have.been.calledWithExactly([SHOP_ID]);
  });

  it('should get shops and denorm none', async () => {
    req.body.denorm = 'false';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
    expect(models.productVariations.getByProductIdsWithOptions).to.have.been.calledWithExactly([1, 2]);
    expect(models.shops.getByIds).not.to.have.been.called;
  });

  it('should call getFilteredOnlyIds', async () => {
    req.body.options = 'products';
    req.body.fields = ['id'];
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, {});
    expect(models.products.getFiltered).not.to.have.been.called;
    expect(models.products.getFilteredCount).not.to.have.been.called;
    expect(models.products.getFilteredFilters).not.to.have.been.called;
    expect(models.products.getStatesCounts).not.to.have.been.called;
    expect(models.productVariations.getByProductIdsWithOptions).not.to.have.been.called;
  });

  it('should get only products array', async () => {
    req.body.options = 'products';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).not.to.have.been.called;
    expect(models.products.getFilteredFilters).not.to.have.been.called;
    expect(models.products.getStatesCounts).not.to.have.been.called;
  });

  it('should get only counts', async () => {
    req.body.options = 'counts';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).not.to.have.been.called;
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).not.to.have.been.called;
    expect(models.products.getStatesCounts).not.to.have.been.called;
  });

  it('should get only filters', async () => {
    req.body.options = 'filters';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).not.to.have.been.called;
    expect(models.products.getFilteredCount).not.to.have.been.called;
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).not.to.have.been.called;
  });

  it('should get only statuscounts', async () => {
    req.body.options = 'statuscounts';
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).not.to.have.been.called;
    expect(models.products.getFilteredCount).not.to.have.been.called;
    expect(models.products.getFilteredFilters).not.to.have.been.called;
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
  });

  it('should with combination of options', async () => {
    req.body.options = ['filters', 'counts', 'products', 'statuscounts'];
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
  });

  it('options should be case insensitive', async () => {
    req.body.options = ['fiLTers', 'Counts', 'pRoDucTs', 'sTatusCounts'];
    await routeHandler({}, models, null, req, res);

    expect(models.userProfiles.update).to.have.been.calledWithExactly(10, { last_seen_shop: SHOP_ID });
    expect(models.products.getFilteredOnlyIds).not.to.have.been.called;
    expect(models.products.getFiltered).to.have.been.calledWithExactly(SHOP_ID, undefined, undefined, undefined, {});
    expect(models.products.getFilteredCount).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getFilteredFilters).to.have.been.calledWithExactly(SHOP_ID, {});
    expect(models.products.getStatesCounts).to.have.been.calledWithExactly(SHOP_ID);
  });
});
