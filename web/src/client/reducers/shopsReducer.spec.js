import Promise from 'bluebird';
import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as shopsReducer from './shopsReducer';

chai.use(sinonChai);

const SHOP_ID = 123;

describe('shopsReducer', () => {
  let dispatch;
  let getChannelById;
  let getInitialFilters;
  let getFilteredProductsAndFilters;
  let initialState;

  beforeEach(() => {
    dispatch =  sinon.spy();

    initialState = fromJS({ shopView: { filters: { offset: 0, limit: 50, state: 'draft' }}});
    getInitialFilters = sinon.stub().returns(fromJS({}));
    getFilteredProductsAndFilters = sinon.stub().returns(Promise.resolve('test products and filters result'));
    getChannelById = sinon.stub().returns({ reducers: { shops: { getInitialFilters, getFilteredProductsAndFilters } } });
    shopsReducer.__Rewire__('getChannelById', getChannelById);
    shopsReducer.__Rewire__('initialState', initialState);
  });
  afterEach(() => {
    shopsReducer.__ResetDependency__('initialState');
    shopsReducer.__ResetDependency__('getChannelById');
  });

  describe('pagination', () => {
    it('should update filters to new values', () => {
      const oldFilter = { offset: 10, limit: 20, state: 'draft' };
      const newFilter = { offset: 15, limit: 10, state: 'draft' };
      const expectedFilter = {offset: 15, limit: 10, state: 'draft' };
      const computeNewFilters = shopsReducer.__get__('computeNewFilters');
      const result = computeNewFilters(oldFilter, newFilter);

      expect(result).to.be.eql(expectedFilter);
    });

    it('should reset pagination if new query is set', () => {
      const oldFilter = { offset: 10, limit: 20, state: 'draft' };
      const newFilter = { q: 'query' };
      const expectedFilter = {offset: 0, limit: 50, q: 'query', state: 'draft' };
      const computeNewFilters = shopsReducer.__get__('computeNewFilters');
      const result = computeNewFilters(oldFilter, newFilter);

      expect(result).to.be.eql(expectedFilter);
    });

    it('should reset pagination if query changed', () => {
      const oldFilter = { offset: 10, limit: 20, q: 'query1', state: 'draft' };
      const newFilter = { q: 'query2' };
      const expectedFilter = {offset: 0, limit: 50, q: 'query2', state: 'draft' };
      const computeNewFilters = shopsReducer.__get__('computeNewFilters');
      const result = computeNewFilters(oldFilter, newFilter);

      expect(result).to.be.eql(expectedFilter);
    });

    it('should keep offsets if query is same', () => {
      const oldFilter = { offset: 10, limit: 20, q: 'query1', state: 'draft' };
      const newFilter = { q: 'query1' };
      const computeNewFilters = shopsReducer.__get__('computeNewFilters');
      const result = computeNewFilters(oldFilter, newFilter);

      expect(result).to.be.eql({offset: 10, limit: 20, q: 'query1', state: 'draft' });
    });

    it('should use new offsets if set ', () => {
      const oldFilter = { offset: 10, limit: 20, q: 'query1', state: 'draft' };
      const newFilter = { q: 'query2', offset: 100, limit: 30 };
      const computeNewFilters = shopsReducer.__get__('computeNewFilters');
      const result = computeNewFilters(oldFilter, newFilter);

      expect(result).to.be.eql({offset: 100, limit: 30, q: 'query2', state: 'draft' });
    });
  });

  describe('setFilters', () => {
    beforeEach(() => {
      shopsReducer.__Rewire__('initialState', fromJS({ shopView: { filters: { offset: 0, limit: 20, state: 'active' }, shopId: 'shopId', channelId: 1 } }));
    });
    afterEach(() => {
      shopsReducer.__ResetDependency__('Actions');
      shopsReducer.__ResetDependency__('initialState');
    });

    it('should set new filters', () => {
      const reduction = fromJS({ shopView: { filters: { }, shopId: 'test_shopId', channelId: 1 } });
      const filters = { a: 'test', b: 'test' };

      const setFilters = shopsReducer.__get__('setFilters');
      const yields = setFilters(reduction, filters);

      const res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value();
      getFilteredProductsAndFilters.should.have.been.calledWithExactly('test_shopId', filters);
    });

    it('should set keep using current filters', () => {
      const filters = { a: 'test', b: 'test' };
      const reduction = fromJS({ shopView: { filters: filters, shopId: 'test_shopId', channelId: 1 } });

      const setFilters = shopsReducer.__get__('setFilters');
      const yields = setFilters(reduction);

      const res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value();
      getFilteredProductsAndFilters.should.have.been.calledWithExactly('test_shopId', filters);
    });

    it('should set default filters', () => {
      const reduction = fromJS({ shopView: { filters: {}, shopId: 'test_shopId', channelId: 1 } });

      const setFilters = shopsReducer.__get__('setFilters');
      const yields = setFilters(reduction);

      const res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value();
      getFilteredProductsAndFilters.should.have.been.calledWithExactly('test_shopId', { offset: 0, limit: 20, state: 'active' });
    });

    it('should do nothing if shopId is missing', () => {
      const reduction = fromJS({ shopView: { filters: { } } });
      const filters = { a: 'test', b: 'test' };

      const setFilters = shopsReducer.__get__('setFilters');
      const yields = setFilters(reduction, filters);

      const res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      getFilteredProductsAndFilters.should.not.have.been.called;
    });
  });

  describe('toggleAllProducts', () => {
    let APICall;
    beforeEach(() => {
      APICall = sinon.spy(() => Promise.resolve('test'));
      shopsReducer.__Rewire__('APICall', APICall);
    });
    afterEach(() => {
      shopsReducer.__ResetDependency__('utils');
    });

    it('should make API call', () => {
      const reduction = fromJS({
        shopView: { selectedProducts: { selectedAll: false }, shopId: 10, filters: { test: 'foo'} }
      });

      const toggleAllProducts = shopsReducer.__get__('toggleAllProducts');

      const yields = toggleAllProducts(reduction);

      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      APICall.should.have.been.calledWithExactly({method: 'put', url: '/shops/10/products/search', payload: { limit: null, offset: null, test: 'foo', options: ['products'], fields: ['id'] } });
    });

    it('should clear selection', () => {
      const reduction = fromJS({
        shopView: { selectedProducts: { selectedAll: true, selectedAllVisible: true, selected: 2 }, products: [{id: 1, selected: true}, {id: 2, selected: true}] }
      });

      const toggleAllProducts = shopsReducer.__get__('toggleAllProducts');

      const yields = toggleAllProducts(reduction);

      const store = yields.next().value.get('shopView').toJS();
      expect(store.selectedProducts.selectedAll).to.be.false;
      expect(store.selectedProducts.selectedAllVisible).to.be.false;
      expect(store.selectedProducts.selected).to.eql(0);
      expect(store.products[0].selected).to.be.false;
      expect(store.products[1].selected).to.be.false;
    });
  });

  describe('toggleAllProductsSucceeded', () => {
    it('should select all products', () => {
      const reduction = fromJS({
        shopView: { selectedProducts: { selectedAll: false }, products: [{id: 1}, {id: 2}] }
      });

      const toggleAllProductsSucceeded = shopsReducer.__get__('toggleAllProductsSucceeded');

      const yields = toggleAllProductsSucceeded(reduction, [1, 2, 3]);
      const store = yields.next().value;
      const storeJS = store.get('shopView').toJS();
      expect(storeJS.products[0].selected).to.be.true;
      expect(storeJS.products[1].selected).to.be.true;
      expect(storeJS.selectedProducts.selected).to.be.eql(3);
      expect(storeJS.selectedProducts.selectedAll).to.be.true;
    });
  });

  describe('navigateToShop', () => {
    it('should reset shopView', () => {
      const reduction = fromJS({ shopView: { dropdown: { open: true }, test: 'value' } });
      const navigateToShop = shopsReducer.__get__('navigateToShop');

      const yields = navigateToShop(reduction, SHOP_ID);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      const store = yields.next().value;
      expect(typeof store).to.eql('object');
      expect(store.get('shopView')).to.eql(initialState.get('shopView'));
    });

    it('should close dropdown', () => {
      const reduction = fromJS({ shopView: { dropdown: { open: true } } });
      const navigateToShop = shopsReducer.__get__('navigateToShop');

      const yields = navigateToShop(reduction, SHOP_ID);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(dispatch.callCount).to.eql(1);
      expect(dispatch.args[0]).to.eql([{type: 'Application.navigate_to_shop', payload: SHOP_ID}]);
    });
  });

  describe('setShopId', () => {
    it('should set shop id', () => {
      const reduction = fromJS({shopView: { shopId: 1 } });

      const setShopId = shopsReducer.__get__('setShopId');
      const yields = setShopId(reduction, {shopId: 2, channelId: 1});

      for (let i = 0; i < 2; i++) {
        const action = yields.next().value;
        expect(typeof action).to.eql('function');
        action(dispatch);
      }

      const store = yields.next().value;
      expect(typeof store).to.eql('object');
      expect(store.getIn(['shopView', 'shopId'])).to.eql(2);
    });

    it('should do nothing if shop id is same as current one', () => {
      const reduction = fromJS({shopView: { shopId: 1 } });

      const setShopId = shopsReducer.__get__('setShopId');
      const yields = setShopId(reduction, {shopId: 1, channelId: 1});
      const store = yields.next().value;
      expect(typeof store).to.eql('object');
      expect(store.getIn(['shopView', 'shopId'])).to.eql(1);
    });

    it('should dispatch set shop id message and trigger GET products', () => {
      const reduction = fromJS({shopView: { shopId: 1 } });

      const setShopId = shopsReducer.__get__('setShopId');
      const yields = setShopId(reduction, {shopId: 2, channelId: 1});

      for (let i = 0; i < 2; i++) {
        const action = yields.next().value;
        expect(typeof action).to.eql('function');
        action(dispatch);
      }

      expect(dispatch.callCount).to.eql(2);
      const args = dispatch.args;

      expect(args[0]).to.eql([{type: 'Application.set_shop_id', payload: 2}]);
      expect(args[1]).to.eql([{type: 'Shops.set_filters', payload: initialState.getIn(['shopView', 'filters']).toJS()}]);
    });

    it('should force set shop id', () => {
      const reduction = fromJS({shopView: { shopId: 2 } });

      const setShopId = shopsReducer.__get__('setShopId');
      const yields = setShopId(reduction, {shopId: 2, channelId: 1, force: true});

      for (let i = 0; i < 2; i++) {
        const action = yields.next().value;
        expect(typeof action).to.eql('function');
        action(dispatch);
      }

      const store = yields.next().value;
      expect(typeof store).to.eql('object');
      expect(store.getIn(['shopView', 'shopId'])).to.eql(2);
    });
  });
});
