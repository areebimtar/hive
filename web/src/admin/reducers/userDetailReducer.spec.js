import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import * as userDetailReducer from './userDetailReducer';
import initialState from '../initialState';

chai.use(sinonChai);

describe('admin userDetailReducer', () => {
  let dispatch;

  beforeEach(() => {
    dispatch =  sinon.spy();
  });

  describe('getUserDetail', () => {
    it('should make appropriate API calls', () => {
      const userId = 10;

      const APICall = sinon.spy(() => ({then: () => {}}));
      userDetailReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const getUserDetail = userDetailReducer.__get__('getUserDetail');

      const yields = getUserDetail(reduction, userId);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(2);

      expect(APICall.getCall(0).args[0]).to.eql({
        method: 'get',
        url: `/admin/users/${userId}`
      });
      expect(APICall.getCall(1).args[0]).to.eql({
        method: 'get',
        url: `/admin/users/${userId}/shops`
      });

      userDetailReducer.__ResetDependency__('APICall');
    });

    it('sets loading flag to true', () => {
      const userId = 5;

      const APICall = sinon.spy(() => ({then: () => {}}));
      userDetailReducer.__Rewire__('APICall', APICall);

      const getUserDetail = userDetailReducer.__get__('getUserDetail');

      const yields = getUserDetail(initialState, userId);
      const action = yields.next().value;
      const reduction = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(reduction.getIn(['userDetail', 'loading'])).to.eql(true);

      userDetailReducer.__ResetDependency__('APICall');
    });
  });

  describe('getUserDetailSucceeded', () => {
    it('sets loading flag to false', () => {
      const getUserDetailSucceeded = userDetailReducer.__get__('getUserDetailSucceeded');

      const yields = getUserDetailSucceeded(initialState, {
        user: {},
        shops: {}
      });
      const reduction = yields.next().value;

      expect(reduction.getIn(['userDetail', 'loading'])).to.eql(false);
    });
  });

  describe('getUserDetailFailed', () => {
    it('sets loading flag to false', () => {
      const getUserDetailFailed = userDetailReducer.__get__('getUserDetailFailed');

      const yields = getUserDetailFailed(initialState, {
        error: 'Error'
      });
      const reduction = yields.next().value;

      expect(reduction.getIn(['userDetail', 'loading'])).to.eql(false);
    });
  });

  describe('clearUserDetail', () => {
    it('sets the detail state back to initial value', () => {
      const clearUserDetail = userDetailReducer.__get__('clearUserDetail');

      const inputReduction = initialState
        .setIn(['userDetail', 'otherValue'], 'other val');
      const yields = clearUserDetail(inputReduction);
      const reduction = yields.next().value;

      expect(reduction.get('userDetail').toJS())
        .to.eql(initialState.get('userDetail').toJS());
    });
  });

  describe('impersonateUser', () => {
    it('calls the API', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      userDetailReducer.__Rewire__('APICall', APICall);

      const impersonateUser = userDetailReducer.__get__('impersonateUser');

      const inputReduction = initialState
        .setIn(['userDetail', 'user'], fromJS({ id: '5'}));
      const yields = impersonateUser(inputReduction);
      const action = yields.next().value;
      action(dispatch);

      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/impersonation/impersonate/5'
      });

      userDetailReducer.__ResetDependency__('APICall');
    });
  });
});
