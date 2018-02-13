import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import * as Actions from '../actions';
import * as shopDetailReducer from './shopDetailReducer';
import initialState from '../initialState';

chai.use(sinonChai);

describe('admin shopDetailReducer', () => {
  let dispatch;

  beforeEach(() => {
    dispatch =  sinon.spy();
  });

  describe('getShopDetail', () => {
    it('should make appropriate API calls', () => {
      const shopId = 10;

      const APICall = sinon.spy(() => ({then: () => {}}));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const getShopDetail = shopDetailReducer.__get__('getShopDetail');

      const yields = getShopDetail(reduction, shopId);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(3);

      expect(APICall.getCall(0).args[0]).to.eql({
        method: 'get',
        url: `/admin/shops/${shopId}`,
        params: {
          denorm: true
        }
      });
      expect(APICall.getCall(1).args[0]).to.eql({
        method: 'get',
        url: `/admin/shops/${shopId}/owners`
      });
      expect(APICall.getCall(2).args[0]).to.eql({
        method: 'get',
        url: `/admin/shops/${shopId}/products/search`
      });

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('sets loading flag to true', () => {
      const shopId = 5;

      const APICall = sinon.spy(() => ({then: () => {}}));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const getShopDetail = shopDetailReducer.__get__('getShopDetail');

      const yields = getShopDetail(initialState, shopId);
      const action = yields.next().value;
      const reduction = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(reduction.getIn(['shopDetail', 'loading'])).to.eql(true);

      shopDetailReducer.__ResetDependency__('APICall');
    });
  });

  describe('getShopDetailSucceeded', () => {
    it('sets loading flag to false', () => {
      const getShopDetailSucceeded = shopDetailReducer.__get__('getShopDetailSucceeded');

      const yields = getShopDetailSucceeded(initialState, {
        shop: {},
        owners: {},
        products: {}
      });
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopDetail', 'loading'])).to.eql(false);
    });
  });

  describe('getShopDetailFailed', () => {
    it('sets loading flag to false', () => {
      const getShopDetailFailed = shopDetailReducer.__get__('getShopDetailFailed');

      const yields = getShopDetailFailed(initialState, {
        error: 'Error'
      });
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopDetail', 'loading'])).to.eql(false);
    });
  });

  describe('clearShopDetail', () => {
    it('sets the detail state back to initial value', () => {
      const clearShopDetail = shopDetailReducer.__get__('clearShopDetail');

      const inputReduction = initialState
        .setIn(['shopDetail', 'otherValue'], 'other val');
      const yields = clearShopDetail(inputReduction);
      const reduction = yields.next().value;

      expect(reduction.get('shopDetail').toJS())
        .to.eql(initialState.get('shopDetail').toJS());
    });
  });

  describe('syncShop', () => {
    it('sets sync start in state', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const syncShop = shopDetailReducer.__get__('syncShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = syncShop(inputReduction);
      const action = yields.next().value;
      const reduction = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(reduction.getIn(['shopDetail', 'syncStart'])).to.not.eql(undefined);

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('calls appropriate API', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const syncShop = shopDetailReducer.__get__('syncShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = syncShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/shops/5/sync'
      });

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches appropriate action on success', async () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const syncShop = shopDetailReducer.__get__('syncShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = syncShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.syncShopSucceeded());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches appropriate action on failure', async () => {
      const APICall = sinon.spy(() => new Promise(() => {
        const err = 'error';
        throw err;
      }));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const syncShop = shopDetailReducer.__get__('syncShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = syncShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.syncShopFailed('error'));

      shopDetailReducer.__ResetDependency__('APICall');
    });
  });

  describe('syncShopSucceeded', () => {
    it('starts polling', () => {
      const syncShopSucceeded = shopDetailReducer.__get__('syncShopSucceeded');

      const yields = syncShopSucceeded(initialState);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.scheduleShopDetailPoll());
    });
  });

  describe('deleteShop', () => {
    it('does not augment state', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const deleteShop = shopDetailReducer.__get__('deleteShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = deleteShop(inputReduction);
      const action = yields.next().value;
      const reduction = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(reduction.get('shopDetail').toJS())
        .to.eql(inputReduction.get('shopDetail').toJS());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('calls appropriate API', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const deleteShop = shopDetailReducer.__get__('deleteShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = deleteShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'delete',
        url: '/admin/shops/5'
      });

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches appropriate action on success', async () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const deleteShop = shopDetailReducer.__get__('deleteShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = deleteShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.deleteShopSucceeded());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches appropriate action on failure', async () => {
      const APICall = sinon.spy(() => new Promise(() => {
        throw new Error();
      }));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const deleteShop = shopDetailReducer.__get__('deleteShop');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = deleteShop(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.deleteShopFailed());

      shopDetailReducer.__ResetDependency__('APICall');
    });
  });

  describe('deleteShopSucceeded', () => {
    it('goes back in history', () => {
      const browserHistory = {
        goBack: sinon.spy()
      };
      shopDetailReducer.__Rewire__('browserHistory', browserHistory);

      const deleteShopSucceeded = shopDetailReducer.__get__('deleteShopSucceeded');

      const yields = deleteShopSucceeded(initialState);
      const reduction = yields.next().value;

      expect(reduction.get('shopDetail').toJS())
        .to.eql(initialState.get('shopDetail').toJS());
      expect(browserHistory.goBack).to.have.been.called;

      shopDetailReducer.__ResetDependency__('browserHistory');
    });
  });

  describe('scheduleShopDetailPoll', () => {
    it('polls the shop data after certain time', () => {
      const clock = sinon.useFakeTimers();

      const scheduleShopDetailPoll = shopDetailReducer.__get__('scheduleShopDetailPoll');

      const yields = scheduleShopDetailPoll(initialState);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      clock.tick(2001);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.pollShopDetail());
    });
  });

  describe('pollShopDetail', () => {
    it('does not augment the state', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const pollShopDetail = shopDetailReducer.__get__('pollShopDetail');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = pollShopDetail(inputReduction);
      const action = yields.next().value;
      const reduction = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(reduction.get('shopDetail').toJS())
        .to.eql(inputReduction.get('shopDetail').toJS());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('calls shop data API', () => {
      const APICall = sinon.spy(() => Promise.resolve());
      shopDetailReducer.__Rewire__('APICall', APICall);

      const pollShopDetail = shopDetailReducer.__get__('pollShopDetail');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = pollShopDetail(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(APICall).to.have.been.calledOnce;
      expect(APICall).to.have.been.calledWith({
        method: 'get',
        url: '/admin/shops/5'
      });

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches succeed action when shops last sync timestamp is default', async () => {
      const defaultSyncTimestamp = '1998-12-31T23:00:00.000Z';
      const APICall = sinon.spy(() => Promise.resolve({
        last_sync_timestamp: defaultSyncTimestamp
      }));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const pollShopDetail = shopDetailReducer.__get__('pollShopDetail');

      const inputReduction = initialState
        .setIn(['shopDetail', 'syncStart'], defaultSyncTimestamp);
      const yields = pollShopDetail(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).to.have.been.calledOnce;
      expect(dispatch).to.have.been.calledWith(Actions.ShopDetail.pollShopDetailSucceeded());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('dispatches succeed action when shops last sync timestamp is after sync start time', async () => {
      const APICall = sinon.spy(() => Promise.resolve({
        last_sync_timestamp: '2017-07-04T14:28:28.805Z'
      }));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const pollShopDetail = shopDetailReducer.__get__('pollShopDetail');

      const inputReduction = initialState
        .setIn(['shopDetail', 'syncStart'], '2017-07-04T13:28:28.805Z');
      const yields = pollShopDetail(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).to.have.been.calledOnce;
      expect(dispatch).to.have.been.calledWith(Actions.ShopDetail.pollShopDetailSucceeded());

      shopDetailReducer.__ResetDependency__('APICall');
    });

    it('schedules next poll when shops last sync timestamp is before sync start time', async () => {
      const APICall = sinon.spy(() => Promise.resolve({
        last_sync_timestamp: '2017-07-04T13:28:28.805Z'
      }));
      shopDetailReducer.__Rewire__('APICall', APICall);

      const pollShopDetail = shopDetailReducer.__get__('pollShopDetail');

      const inputReduction = initialState
        .setIn(['shopDetail', 'syncStart'], '2017-07-04T14:28:28.805Z');
      const yields = pollShopDetail(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      await action(dispatch);

      expect(dispatch).to.have.been.calledOnce;
      expect(dispatch).to.have.been.calledWith(Actions.ShopDetail.scheduleShopDetailPoll());

      shopDetailReducer.__ResetDependency__('APICall');
    });
  });

  describe('pollShopDetailSucceeded', () => {
    it('dispatches action to get shop', () => {
      const pollShopDetailSucceeded = shopDetailReducer.__get__('pollShopDetailSucceeded');

      const inputReduction = initialState.setIn(['shopDetail', 'shop', 'id'], 5);
      const yields = pollShopDetailSucceeded(inputReduction);
      const action = yields.next().value;
      yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(dispatch).have.been.calledOnce;
      expect(dispatch).have.been.calledWith(Actions.ShopDetail.getShopDetail(5));
    });

    it('deletes sync start from state', () => {
      const pollShopDetailSucceeded = shopDetailReducer.__get__('pollShopDetailSucceeded');

      const inputReduction = initialState.setIn(['shopDetail', 'syncStart'], 5);
      const yields = pollShopDetailSucceeded(inputReduction);
      yields.next().value;
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopDetail', 'syncStart'])).to.eql(undefined);
    });
  });

  describe('pollShopDetailFailed', () => {
    it('deletes sync start from state', () => {
      const pollShopDetailFailed = shopDetailReducer.__get__('pollShopDetailFailed');

      const inputReduction = initialState.setIn(['shopDetail', 'syncStart'], 5);
      const yields = pollShopDetailFailed(inputReduction);
      const reduction = yields.next().value;

      expect(reduction.getIn(['shopDetail', 'syncStart'])).to.eql(undefined);
    });
  });
});
