import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as Actions from '../actions';

import * as applicationReducer from './applicationReducer';

chai.use(sinonChai);

describe('admin applicationReducer', () => {
  let dispatch;

  beforeEach(() => {
    dispatch =  sinon.spy();
  });

  describe('bootstrap', () => {
    it('dispatches appropriate actions', () => {
      const reduction = fromJS({});
      const bootstrap = applicationReducer.__get__('bootstrap');

      const yields = bootstrap(reduction);
      let action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(dispatch).to.have.been.calledTwice;
      expect(dispatch).to.have.been.calledWith(
        Actions.Application.getUserInfo());
      expect(dispatch).to.have.been.calledWith(
        Actions.Application.getImpersonation());
    });
  });

  describe('getUserInfo', () => {
    it('makes and API call', () => {
      const APICall = sinon.spy(() => ({then: () => {}}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const getUserInfo = applicationReducer.__get__('getUserInfo');

      const yields = getUserInfo(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/userInfo'
      });

      applicationReducer.__ResetDependency__('APICall');
    });
  });

  describe('downloadShopCounts', () => {
    it('should make API call', () => {
      const APICall = sinon.spy(() => ({then: () => {}}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const downloadShopCounts = applicationReducer.__get__('downloadShopCounts');

      const yields = downloadShopCounts(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(1);
      expect(APICall.args[0][0]).to.eql({method: 'get', url: '/admin/shops/counts'});

      applicationReducer.__ResetDependency__('APICall');
    });
  });

  describe('getImpersonation', () => {
    it('makes API call', () => {
      const APICall = sinon.spy(() => ({then: () => {}}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const getImpersonation = applicationReducer.__get__('getImpersonation');

      const yields = getImpersonation(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/impersonation'
      });

      applicationReducer.__ResetDependency__('APICall');
    });
  });

  describe('stopImpersonating', () => {
    it('makes API call', () => {
      const APICall = sinon.spy(() => ({then: () => {}}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const stopImpersonating = applicationReducer.__get__('stopImpersonating');

      const yields = stopImpersonating(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/impersonation/cancel'
      });

      applicationReducer.__ResetDependency__('APICall');
    });
  });
});
