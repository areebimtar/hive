import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as shopsLookupReducer from './shopsLookupReducer';
import initialState from '../initialState';
import CONSTANTS from '../constants/actions';

chai.use(sinonChai);

describe('admin shopsLookupReducer', () => {
  let dispatch;
  let APICall;

  beforeEach(() => {
    dispatch =  sinon.spy();
    APICall = sinon.spy(() => ({
      then: function then() { return this; },
      catch: function catchMock() { return this; }
    }));
  });

  describe('init', () => {
    it('sets the lookup state back to initial value', () => {
      const init = shopsLookupReducer.__get__('init');

      const inputReduction = initialState
        .setIn(['shopsLookup', 'otherValue'], 'other val');
      const yields = init(inputReduction);
      const reduction = yields.next().value;

      expect(reduction.get('shopsLookup').toJS())
        .to.eql(initialState.get('shopsLookup').toJS());
    });

    it('gets query from route and dispatches onSearchQueryChanged and shopsSearch', () => {
      const init = shopsLookupReducer.__get__('init');

      const inputReduction = initialState
        .setIn(['combined', 'routing', 'locationBeforeTransitions', 'query', 'query'], 'query');
      const yields = init(inputReduction);
      const action1 = yields.next().value;
      const action2 = yields.next().value;
      const reduction = yields.next().value;
      action1(dispatch);
      action2(dispatch);

      expect(dispatch.callCount).to.eql(2);
      expect(dispatch.getCall(0).args[0].type)
        .to.eql(CONSTANTS.SHOPSLOOKUP.ON_SEARCH_QUERY_CHANGED);
      expect(dispatch.getCall(0).args[0].payload)
        .to.eql('query');
      expect(dispatch.getCall(1).args[0].type)
        .to.eql(CONSTANTS.SHOPSLOOKUP.SEARCH_SHOPS);
      expect(dispatch.getCall(1).args[0].payload)
        .to.eql('query');

      expect(reduction.get('shopsLookup').toJS())
        .to.eql(initialState.get('shopsLookup').toJS());
    });
  });

  describe('onSearchQueryChanged', () => {
    it('properly sets search query', () => {
      const onSearchQueryChanged = shopsLookupReducer.__get__('onSearchQueryChanged');

      const query = 'search_query';
      const yields = onSearchQueryChanged(initialState, query);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'searchQuery'])).to.eql(query);
    });
  });

  describe('searchShops', () => {
    it('should make API call', () => {
      shopsLookupReducer.__Rewire__('APICall', APICall);

      const searchShops = shopsLookupReducer.__get__('searchShops');

      const query = 'search_query';
      const yields = searchShops(initialState, query);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(1);

      expect(APICall.getCall(0).args[0]).to.eql({
        method: 'get',
        url: '/admin/shops/search',
        params: { query }
      });

      shopsLookupReducer.__ResetDependency__('APICall');
    });

    it('should set query to state', () => {
      shopsLookupReducer.__Rewire__('APICall', APICall);

      const searchShops = shopsLookupReducer.__get__('searchShops');

      const query = 'search_query';
      const yields = searchShops(initialState, query);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'lastUsedSearchQuery']))
        .to.be.eql(query);

      shopsLookupReducer.__ResetDependency__('APICall');
    });
  });

  describe('searchShopsSucceeded', () => {
    it('sets loading flag to false and deletes any error', () => {
      const searchShopsSucceeded = shopsLookupReducer.__get__('searchShopsSucceeded');

      const inputReduction = initialState
        .setIn(['shopsLookup', 'error'], 'Error');
      const yields = searchShopsSucceeded(inputReduction, {});
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'error'])).to.eql(undefined);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.SHOPSLOOKUP.END_LOADING);
    });
  });

  describe('searchShopsFailed', () => {
    it('sets sets the error adn triggers loading end', () => {
      const searchShopsFailed = shopsLookupReducer.__get__('searchShopsFailed');

      const err = 'Error str';
      const yields = searchShopsFailed(initialState, err);
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'error'])).to.eql(err);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.SHOPSLOOKUP.END_LOADING);
    });
  });

  describe('startLoading', () => {
    it('sets loading flag to true', () => {
      const startLoading = shopsLookupReducer.__get__('startLoading');

      const yields = startLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'loading'])).to.eql(true);
    });
  });

  describe('endLoading', () => {
    it('sets loading flag to false', () => {
      const endLoading = shopsLookupReducer.__get__('endLoading');

      const yields = endLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopsLookup', 'loading'])).to.eql(false);
    });
  });
});
