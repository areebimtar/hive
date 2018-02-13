import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import _ from 'lodash';
import { fromJS } from 'immutable';

import * as reassignShopReducer from './reassignShopReducer';
import initialState from '../initialState';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';

chai.use(sinonChai);

describe('admin reassignShopReducer', () => {
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
    it('sets the reassignShop state back to initial value and adds the shop', () => {
      const init = reassignShopReducer.__get__('init');

      const shop = {
        shop_param: 'shop_param'
      };
      const inputReduction = initialState
        .setIn(['reassignShop', 'otherValue'], 'other val');
      const yields = init(inputReduction, shop);
      const reduction = yields.next().value;

      const expectedState = _.merge(initialState.get('reassignShop').toJS(), { shop });
      expect(reduction.get('reassignShop').toJS()).to.eql(expectedState);
    });
  });

  describe('onSearchQueryChanged', () => {
    it('properly sets search query', () => {
      const onSearchQueryChanged = reassignShopReducer.__get__('onSearchQueryChanged');

      const query = 'search_query';
      const yields = onSearchQueryChanged(initialState, query);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'searchQuery'])).to.eql(query);
    });
  });

  describe('searchUsers', () => {
    it('should make API call', () => {
      reassignShopReducer.__Rewire__('APICall', APICall);

      const searchUsers = reassignShopReducer.__get__('searchUsers');

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

      reassignShopReducer.__ResetDependency__('APICall');
    });

    it('should set query to state', () => {
      reassignShopReducer.__Rewire__('APICall', APICall);

      const searchUsers = reassignShopReducer.__get__('searchUsers');

      const query = 'search_query';
      const yields = searchUsers(initialState, query);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'lastUsedSearchQuery']))
        .to.be.eql(query);

      reassignShopReducer.__ResetDependency__('APICall');
    });
  });

  describe('searchUsersSucceeded', () => {
    it('sets loading flag to false and deletes any error', () => {
      const searchUsersSucceeded = reassignShopReducer.__get__('searchUsersSucceeded');

      const inputReduction = initialState
        .setIn(['reassignShop', 'error'], 'Error');
      const yields = searchUsersSucceeded(inputReduction, {});
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'error'])).to.eql(undefined);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.REASSIGNSHOP.END_LOADING);
    });
  });

  describe('searchUsersFailed', () => {
    it('sets sets the error adn triggers loading end', () => {
      const searchUsersFailed = reassignShopReducer.__get__('searchUsersFailed');

      const err = 'Error str';
      const yields = searchUsersFailed(initialState, err);
      const action = yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'error'])).to.eql(err);

      action(dispatch);
      expect(dispatch.getCall(0).args[0].type).to.eql(CONSTANTS.REASSIGNSHOP.END_LOADING);
    });
  });

  describe('startLoading', () => {
    it('sets loading flag to true', () => {
      const startLoading = reassignShopReducer.__get__('startLoading');

      const yields = startLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'loading'])).to.eql(true);
    });
  });

  describe('endLoading', () => {
    it('sets loading flag to false', () => {
      const endLoading = reassignShopReducer.__get__('endLoading');

      const yields = endLoading(initialState);
      const reduction = yields.next().value;

      expect(reduction.getIn(['reassignShop', 'loading'])).to.eql(false);
    });
  });

  describe('selectUser', () => {
    it('sets the selected user', () => {
      const selectUser = reassignShopReducer.__get__('selectUser');

      const users = [
        {
          id: 1,
          email: 'user1'
        },
        {
          id: 2,
          email: 'user2'
        },
        {
          id: 3,
          email: 'user3'
        }
      ];
      const inputReduction = initialState
        .setIn(['reassignShop', 'searchResult'], fromJS(users));
      const yields = selectUser(inputReduction, 2);
      const reduction = yields.next().value;

      const selectedUserImm = reduction.getIn(['reassignShop', 'selectedUser']);
      expect(selectedUserImm).to.not.eql(undefined);
      const selectedUser = selectedUserImm.toJS();
      expect(selectedUser).to.eql(users[1]);
    });
  });

  describe('reassignShop', () => {
    const shop = {
      id: '2'
    };
    const users = [
      {
        id: '1',
        email: 'user1',
        company_id: '4'
      },
      {
        id: '2',
        email: 'user2',
        company_id: '5'
      },
      {
        id: '3',
        email: 'user3',
        company_id: '6'
      }
    ];
    let inputReduction;

    beforeEach(() => {
      inputReduction = initialState
        .setIn(['reassignShop', 'shop'], fromJS(shop))
        .setIn(['reassignShop', 'searchResult'], fromJS(users))
        .setIn(['reassignShop', 'selectedUser'], fromJS(users[1]));
    });

    it('calls the API', () => {
      reassignShopReducer.__Rewire__('APICall', APICall);

      const reassignShop = reassignShopReducer.__get__('reassignShop');

      const yields = reassignShop(inputReduction);
      const action = yields.next().value;
      action(dispatch);

      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been
        .calledWith({
          method: 'get',
          url: '/admin/shops/2/reassign/2'
        });

      reassignShopReducer.__ResetDependency__('APICall');
    });

    it('does not alter the state', () => {
      const reassignShop = reassignShopReducer.__get__('reassignShop');

      const yields = reassignShop(inputReduction);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.get('reassignShop').toJS())
        .to.eql(inputReduction.get('reassignShop').toJS());
    });
  });

  describe('reassignShopSucceeded', () => {
    it('dispatches getShopDetail', () => {
      const reassignShopSucceeded = reassignShopReducer.__get__('reassignShopSucceeded');

      const shop = {
        id: 1
      };
      const inputReduction = initialState
        .setIn(['reassignShop', 'shop'], fromJS(shop));
      const yields = reassignShopSucceeded(inputReduction);
      const action = yields.next().value;
      action(dispatch);

      expect(dispatch).to.have.been.calledOnce;
      expect(dispatch).to.have.been
        .calledWith(Actions.ShopDetail.getShopDetail(1));
    });

    it('does not alter the state', () => {
      const reassignShopSucceeded = reassignShopReducer.__get__('reassignShopSucceeded');

      const shop = {
        id: 1
      };
      const inputReduction = initialState
        .setIn(['reassignShop', 'shop'], fromJS(shop));
      const yields = reassignShopSucceeded(inputReduction);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.get('reassignShop').toJS())
        .to.eql(inputReduction.get('reassignShop').toJS());
    });
  });
});
