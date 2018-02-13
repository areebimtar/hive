import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as usersLookupReducer from './usersLookupReducer';
import initialState from '../initialState';
import CONSTANTS from '../constants/actions';

chai.use(sinonChai);

describe('admin usersLookupReducer', () => {
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
      const init = usersLookupReducer.__get__('init');

      const inputReduction = initialState
        .setIn(['usersLookup', 'otherValue'], 'other val');
      const yields = init(inputReduction);
      const reduction = yields.next().value;

      expect(reduction.get('usersLookup').toJS())
        .to.eql(initialState.get('usersLookup').toJS());
    });

    it('gets query from route and dispatches onSearchQueryChanged and searchUsers', () => {
      const init = usersLookupReducer.__get__('init');

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
        .to.eql(CONSTANTS.USERSLOOKUP.ON_SEARCH_QUERY_CHANGED);
      expect(dispatch.getCall(0).args[0].payload)
        .to.eql('query');
      expect(dispatch.getCall(1).args[0].type)
        .to.eql(CONSTANTS.USERSLOOKUP.SEARCH_USERS);
      expect(dispatch.getCall(1).args[0].payload)
        .to.eql('query');

      expect(reduction.get('usersLookup').toJS())
        .to.eql(initialState.get('usersLookup').toJS());
    });
  });

  describe('onSearchQueryChanged', () => {
    it('properly sets search query', () => {
      const onSearchQueryChanged = usersLookupReducer.__get__('onSearchQueryChanged');

      const query = 'search_query';
      const yields = onSearchQueryChanged(initialState, query);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'searchQuery'])).to.eql(query);
    });
  });

  describe('searchUsers', () => {
    it('should make API call', () => {
      usersLookupReducer.__Rewire__('APICall', APICall);

      const searchUsers = usersLookupReducer.__get__('searchUsers');

      const query = 'search_query';
      const yields = searchUsers(initialState, query);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(1);

      expect(APICall.getCall(0).args[0]).to.eql({
        method: 'get',
        url: '/admin/users/search',
        params: { query }
      });

      usersLookupReducer.__ResetDependency__('APICall');
    });

    it('should set query to state', () => {
      usersLookupReducer.__Rewire__('APICall', APICall);

      const searchUsers = usersLookupReducer.__get__('searchUsers');

      const query = 'search_query';
      const yields = searchUsers(initialState, query);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'lastUsedSearchQuery']))
        .to.be.eql(query);

      usersLookupReducer.__ResetDependency__('APICall');
    });
  });

  describe('searchUsersSucceeded', () => {
    it('sets loading flag to false and deletes any error', () => {
      const searchUsersSucceeded = usersLookupReducer.__get__('searchUsersSucceeded');

      const inputReduction = initialState
        .setIn(['usersLookup', 'error'], 'Error');
      const yields = searchUsersSucceeded(inputReduction, {});
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'error'])).to.eql(undefined);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.USERSLOOKUP.END_LOADING);
    });
  });

  describe('searchUsersFailed', () => {
    it('sets sets the error adn triggers loading end', () => {
      const searchUsersFailed = usersLookupReducer.__get__('searchUsersFailed');

      const err = 'Error str';
      const yields = searchUsersFailed(initialState, err);
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'error'])).to.eql(err);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.USERSLOOKUP.END_LOADING);
    });
  });

  describe('startLoading', () => {
    it('sets loading flag to true', () => {
      const startLoading = usersLookupReducer.__get__('startLoading');

      const yields = startLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'loading'])).to.eql(true);
    });
  });

  describe('endLoading', () => {
    it('sets loading flag to false', () => {
      const endLoading = usersLookupReducer.__get__('endLoading');

      const yields = endLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['usersLookup', 'loading'])).to.eql(false);
    });
  });
});
