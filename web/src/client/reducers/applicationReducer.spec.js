import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { SHOP_SYNC_STATUS_INITIAL_SYNC,
  SHOP_SYNC_STATUS_UPTODATE,
  SHOP_SYNC_STATUS_SYNC,
  SHOP_SYNC_TOO_MANY_LISTINGS } from 'global/db/models/constants';

import * as applicationReducer from './applicationReducer';

chai.use(sinonChai);

describe('applicationReducer', () => {
  let dispatch;

  beforeEach(() => {
    dispatch =  sinon.spy();
  });

  describe('getShops', () => {
    it('should make API call', () => {
      const APICall = sinon.spy(() => ({then: () => {}}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const getShops = applicationReducer.__get__('getShops');

      const yields = getShops(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      expect(APICall.callCount).to.eql(1);
      expect(APICall.args[0][0]).to.eql({method: 'get', url: '/shops', params: {denorm: true}});

      applicationReducer.__ResetDependency__('APICall');
    });
  });

  describe('setIntervalId', () => {
    it('should set interval id', () => {
      const reduction = fromJS({});
      const setIntervalId = applicationReducer.__get__('setIntervalId');

      const yields = setIntervalId(reduction, 123);
      const newReduction = yields.next().value;
      expect(typeof newReduction).to.eql('object');

      expect(newReduction.getIn(['shopsPolling', 'intervalId'])).to.eql(123);
    });
  });

  describe('clearSyncFlag', () => {
    it('should clearFlags', () => {
      const reduction = fromJS({
        edit: {
          pendingUpdatesInProgressClearId: 11,
          pendingUpdatesInProgress: true
        }
      });

      const clearSyncFlag = applicationReducer.__get__('clearSyncFlag');

      const yields = clearSyncFlag(reduction);
      const newReduction = yields.next().value;
      expect(typeof newReduction).to.eql('object');
      expect(newReduction.getIn(['edit', 'pendingUpdatesInProgressClearId'])).to.be.undefined;
      expect(newReduction.getIn(['edit', 'pendingUpdatesInProgress'])).to.be.false;
    });
  });

  describe('setSyncFlagTimeoutId', () =>{
    it('should set timeout id', () => {
      const reduction = fromJS({});
      const setSyncFlagTimeoutId = applicationReducer.__get__('setSyncFlagTimeoutId');

      const yields = setSyncFlagTimeoutId(reduction, 123);

      const newReduction = yields.next().value;
      expect(typeof newReduction).to.eql('object');
      expect(newReduction.getIn(['edit', 'pendingUpdatesInProgressClearId'])).to.eql(123);
    });
  });

  describe('getPollingInterval', () => {
    let getPollingInterval;

    beforeEach(() => {
      getPollingInterval = applicationReducer.__get__('getPollingInterval');
    });

    it('should return long interval', () => {
      expect(getPollingInterval(fromJS({}), {id: '123'})).to.eql(60000);
      expect(getPollingInterval(fromJS({}), {sync_status: 'up_to_date', id: '123'})).to.eql(60000);
      expect(getPollingInterval(fromJS({}), {sync_status: 'incomplete', id: '123'})).to.eql(60000);
      expect(getPollingInterval(fromJS({}), {sync_status: 'incomplete_duplicate', id: '123'})).to.eql(60000);
      expect(getPollingInterval(fromJS({}), {sync_status: 'incomplete_too_many_listings', id: '123'})).to.eql(60000);
      expect(getPollingInterval(fromJS({}), {sync_status: 'incomplete_shop_sync_in_vacation_mode', id: '123'})).to.eql(60000);
    });

    it('shourd return short interval for invalid shop (without id)', () => {
      expect(getPollingInterval(fromJS({}), {})).to.eql(1000);
      expect(getPollingInterval(fromJS({}), {id: null})).to.eql(1000);
    });

    it('shourd return short interval during initial sync', () => {
      expect(getPollingInterval(fromJS({}), {sync_status: 'initial_sync'})).to.eql(1000);
    });

    it('shourd return short interval during sync', () => {
      expect(getPollingInterval(fromJS({}), {sync_status: 'sync'})).to.eql(1000);
    });

    it('shourd return short interval during sync', () => {
      expect(getPollingInterval(fromJS({edit: {pendingUpdatesInProgress: true}}), {sync_status: 'up_to_date'})).to.eql(1000);
    });

    it('shourd return short interval during applying operations', () => {
      expect(getPollingInterval(fromJS({}), {applying_operations: true})).to.eql(1000);
    });
  });

  describe('getShopsSucceeded', () => {
    let shouldClearSyncFlag;
    beforeEach(() => {
      shouldClearSyncFlag = sinon.stub();
      applicationReducer.__Rewire__('shouldClearSyncFlag', shouldClearSyncFlag);
    });

    afterEach(() => {
      applicationReducer.__ResetDependency__('shouldClearSyncFlag');
    });

    it('should do nothing if server data are emtpy', () => {
      const reduction = fromJS({shops: {}});
      const setupOptions = sinon.spy();
      applicationReducer.__Rewire__('setupOptions', setupOptions);
      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction);
      const result = yields.next().value;
      expect(setupOptions.callCount).to.eql(0);
      expect(result === reduction).to.be.true;

      applicationReducer.__ResetDependency__('setupOptions');
    });

    it('should set shop data', () => {
      const reduction = fromJS({shops: { current: {}}});
      const setupOptions = sinon.spy();
      applicationReducer.__Rewire__('setupOptions', setupOptions);
      shouldClearSyncFlag.returns(false);
      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const shops = {shops: [1], shopsById: {1: {id: 1}}};

      const yields = getShopsSucceeded(reduction, shops);
      yields.next();
      yields.next();
      expect(setupOptions.callCount).to.eql(1);
      expect(setupOptions.args[0][0].getIn(['shops']).toJS()).to.eql(shops);

      applicationReducer.__ResetDependency__('setupOptions');
    });

    it('should merge shop data with current one', () => {
      const reduction = fromJS({shops: { current: {id: 2} } });
      const setupOptions = sinon.spy();
      applicationReducer.__Rewire__('setupOptions', setupOptions);
      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const shops = {shops: [1], shopsById: {1: {id: 1}}};
      const result = {shops: [1], shopsById: {1: {id: 1}}, current: {id: 2}};

      const yields = getShopsSucceeded(reduction, shops);
      yields.next().value;
      expect(setupOptions.callCount).to.eql(1);

      expect(setupOptions.args[0][0].getIn(['shops']).toJS()).to.eql(result);

      applicationReducer.__ResetDependency__('setupOptions');
    });

    it('should populate current shop', () => {
      const reduction = fromJS({shops: { current: {id: 2} } });
      const setupOptions = sinon.spy();
      applicationReducer.__Rewire__('setupOptions', setupOptions);
      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const shops = {shops: [1, 2], shopsById: {1: {id: 1, test: 'foo'}, 2: {id: 2, test: 'foo'}}};
      const result = {shops: [1, 2], shopsById: {1: {id: 1, test: 'foo'}, 2: {id: 2, test: 'foo'}}, current: {id: 2, test: 'foo'}};

      const yields = getShopsSucceeded(reduction, shops);
      yields.next().value;
      expect(setupOptions.callCount).to.eql(1);

      expect(setupOptions.args[0][0].getIn(['shops']).toJS()).to.eql(result);

      applicationReducer.__ResetDependency__('setupOptions');
    });

    it('should call clearSyncFlag when state is not up_to_date', () => {
      const reduction = fromJS({shops: { current: {id: 1}}, shopsPolling: {interval: 1000}});
      const shops = {shops: [1], shopsById: {1: {id: 1, sync_status: SHOP_SYNC_STATUS_SYNC, to_upload: 1 }}};
      const setupOptions = sinon.spy();
      const clearSyncFlag = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();

      applicationReducer.__Rewire__('setupOptions', setupOptions);
      applicationReducer.__Rewire__('Actions', { Application: { clearSyncFlag, rescheduleShopsPoll } });
      shouldClearSyncFlag.returns(true);

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, shops);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      clearSyncFlag.should.have.been.calledWithExactly();

      applicationReducer.__ResetDependency__('setupOptions');
      applicationReducer.__ResetDependency__('Actions');
      applicationReducer.__ResetDependency__('rescheduleShopsPoll');
    });

    it('should reschedule polling interval to slower polling', () => {
      const reduction = fromJS({shops: { current: {id: 1}}, shopsPolling: {interval: 0}});
      const shops = {shops: [1], shopsById: {1: {id: 1, sync_status: SHOP_SYNC_STATUS_UPTODATE }}};
      const setupOptions = sinon.spy();
      const clearSyncFlag = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();

      applicationReducer.__Rewire__('setupOptions', setupOptions);
      applicationReducer.__Rewire__('Actions', { Application: { clearSyncFlag, rescheduleShopsPoll } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, shops);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      rescheduleShopsPoll.should.have.been.calledWithExactly(60000);

      applicationReducer.__ResetDependency__('setupOptions');
      applicationReducer.__ResetDependency__('Actions');
      applicationReducer.__ResetDependency__('rescheduleShopsPoll');
    });

    it('should reschedule polling interval to faster polling', () => {
      const reduction = fromJS({shops: { current: {id: 1}}, shopsPolling: {interval: 0}});
      const shops = {shops: [1], shopsById: {1: {id: 1, sync_status: SHOP_SYNC_STATUS_SYNC, to_upload: 1 }}};
      const setupOptions = sinon.spy();
      const clearSyncFlag = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();

      applicationReducer.__Rewire__('setupOptions', setupOptions);
      applicationReducer.__Rewire__('Actions', { Application: { clearSyncFlag, rescheduleShopsPoll } });
      shouldClearSyncFlag.returns(true);

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, shops);
      let action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      rescheduleShopsPoll.should.have.been.calledWithExactly(1000);
      clearSyncFlag.should.have.been.calledWithExactly();

      applicationReducer.__ResetDependency__('setupOptions');
      applicationReducer.__ResetDependency__('Actions');
      applicationReducer.__ResetDependency__('rescheduleShopsPoll');
    });

    it('should call setFilters when initial shop sync is completed', () => {
      const reduction = fromJS({shops: { current: {id: 1, sync_status: SHOP_SYNC_STATUS_INITIAL_SYNC}}});
      const shops = {shops: [1], shopsById: {1: {id: 1, sync_status: SHOP_SYNC_STATUS_UPTODATE}}};
      const setupOptions = sinon.spy();
      const setFilters = sinon.spy();

      applicationReducer.__Rewire__('setupOptions', setupOptions);
      applicationReducer.__Rewire__('Actions', { Shops: { setFilters: setFilters } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, shops);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      setFilters.should.have.been.calledWithExactly();

      applicationReducer.__ResetDependency__('setupOptions');
      applicationReducer.__ResetDependency__('Actions');
    });

    it('should hide sync status and hide sync modal and leave bulk edit when curent shop gets invalid', () => {
      const reduction = fromJS({shops: {shopsById: {1: {channel_id: '2'}}, current: {id: '1', invalid: false}, channelsById: {2: {name: 'etsy'}}}});
      const shops = {shops: ['1'], shopsById: {1: {id: '1', channel_id: '2', sync_status: SHOP_SYNC_TOO_MANY_LISTINGS, invalid: true }}};
      const setupOptions = sinon.spy();
      const clearSyncFlag = sinon.spy();
      const openSyncStatusModal = sinon.spy();
      const changeRoute = sinon.spy();

      applicationReducer.__Rewire__('setupOptions', setupOptions);
      applicationReducer.__Rewire__('Actions', { Application: { clearSyncFlag, changeRoute }, Shops: { openSyncStatusModal } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, shops);
      let action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      clearSyncFlag.should.have.been.calledWithExactly();

      action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      openSyncStatusModal.should.have.been.calledWithExactly(false);

      action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      changeRoute.should.have.been.calledWithExactly('/etsy/1');

      applicationReducer.__ResetDependency__('setupOptions');
      applicationReducer.__ResetDependency__('Actions');
    });

    it('closes the apply progress modal if it\'s shown and data are up-to-date', () => {
      const reduction = fromJS({
        shops: {
          current: {
            id: 1
          }
        },
        edit: {
          applyProgressModal: {
            shown: true
          }
        }
      });
      const data = {
        shops: ['1'],
        shopsById: {1: {id: '1', channel_id: '2', sync_status: SHOP_SYNC_STATUS_UPTODATE, invalid: false }}
      };

      const setApplyProgressModalShown = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();
      applicationReducer.__Rewire__('Actions', { BulkEdit: { setApplyProgressModalShown }, Application: { rescheduleShopsPoll } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, data);
      const res = yields.next();
      const action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      setApplyProgressModalShown.should.have.been.calledWithExactly(false);

      applicationReducer.__ResetDependency__('Actions');
    });

    it('opens the apply progress modal if it\'s not shown and apply ops are in progress', () => {
      const reduction = fromJS({
        shops: {
          current: {
            id: 1
          }
        },
        edit: {
          applyProgressModal: {
            shown: false
          }
        }
      });
      const data = {
        shops: ['1'],
        shopsById: {
          1: {
            id: '1', channel_id: '2',
            sync_status: SHOP_SYNC_STATUS_UPTODATE,
            applying_operations: true,
            invalid: false
          }
        }
      };

      const setApplyProgressModalShown = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();
      applicationReducer.__Rewire__('Actions', { BulkEdit: { setApplyProgressModalShown }, Application: { rescheduleShopsPoll } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, data);
      let res = yields.next();
      let action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      rescheduleShopsPoll.should.have.been.called;

      res = yields.next();
      action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      setApplyProgressModalShown.should.have.been.calledWithExactly(true);

      applicationReducer.__ResetDependency__('Actions');
    });

    it('opens the apply progress modal if it\'s not shown and sync of pending updates is in progress', () => {
      const reduction = fromJS({
        shops: {
          current: {
            id: 1
          }
        },
        edit: {
          applyProgressModal: {
            shown: false
          },
          applyOperationsInProgress: true
        }
      });
      const data = {
        shops: ['1'],
        shopsById: {
          1: {
            id: '1', channel_id: '2',
            sync_status: SHOP_SYNC_STATUS_UPTODATE,
            applying_operations: false,
            invalid: false
          }
        }
      };

      const setApplyProgressModalShown = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();
      applicationReducer.__Rewire__('Actions', { BulkEdit: { setApplyProgressModalShown }, Application: { rescheduleShopsPoll } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, data);
      let res = yields.next();
      let action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      rescheduleShopsPoll.should.have.been.called;

      res = yields.next();
      action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      setApplyProgressModalShown.should.have.been.calledWithExactly(true);

      applicationReducer.__ResetDependency__('Actions');
    });

    it('updates progress in apply progress modal', () => {
      const reduction = fromJS({
        shops: {
          current: {
            id: 1
          }
        },
        edit: {
          applyProgressModal: {
            shown: true
          }
        }
      });
      const data = {
        shops: ['1'],
        shopsById: {
          1: {
            id: '1', channel_id: '2',
            sync_status: SHOP_SYNC_STATUS_UPTODATE,
            applying_operations: true,
            to_apply: 10,
            applied: 6,
            invalid: false }
        }
      };

      const setApplyProgressModalProgress = sinon.spy();
      const rescheduleShopsPoll = sinon.spy();
      applicationReducer.__Rewire__('Actions', { BulkEdit: { setApplyProgressModalProgress }, Application: { rescheduleShopsPoll } });

      const getShopsSucceeded = applicationReducer.__get__('getShopsSucceeded');

      const yields = getShopsSucceeded(reduction, data);
      let res = yields.next();
      let action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      rescheduleShopsPoll.should.have.been.called;

      res = yields.next();
      action = res.value;
      expect(typeof action).to.eql('function');
      action(dispatch);
      setApplyProgressModalProgress.should.have.been.calledWithExactly({ progress: 6, total: 10 });

      applicationReducer.__ResetDependency__('Actions');
    });
  });

  describe('scheduleSyncFlagClearing', () => {
    it('should schedule flag clearing and set handler id', () => {
      const timeout = sinon.stub().returns(99);
      const setSyncFlagTimeoutId  = sinon.spy();

      applicationReducer.__Rewire__('Actions', { Application: { setSyncFlagTimeoutId: setSyncFlagTimeoutId } });
      applicationReducer.__Rewire__('mySetTimeout', timeout);

      const scheduleSyncFlagClearing = applicationReducer.__get__('scheduleSyncFlagClearing');
      const reduction = fromJS({});
      const yields = scheduleSyncFlagClearing(reduction);

      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      action(dispatch);

      expect(setSyncFlagTimeoutId.args[0][0], 'Id set with id returned from timeout').to.be.eql(99);
      expect(timeout.callCount, 'timeout called once').to.eql(1);

      applicationReducer.__ResetDependency__('Actions');
      applicationReducer.__ResetDependency__('mySetTimeout');
    });
  });

  describe('setupOptions', () => {
    it('should setup options for shops dropdonw', () => {
      const reduction = fromJS({
        shops: {
          shops: [1, 2],
          shopsById: {
            1: {
              id: 1,
              channel_id: 1,
              name: 'foo'
            },
            2: {
              id: 2,
              channel_id: 1,
              name: 'bar'
            }
          },
          channelsById: {
            1: {
              id: 1,
              name: 'etsy'
            }
          }
        }
      });

      const setupOptions = applicationReducer.__get__('setupOptions');
      const state = setupOptions(reduction);
      expect(state.getIn(['shops', 'options']).toJS()).to.eql([{id: 2, channel_id: 1, name: 'bar', channel: 'etsy', _selected: false}, {id: 1, channel_id: 1, name: 'foo', channel: 'etsy', _selected: false}]);
    });

    it('should set selected flag', () => {
      const reduction = fromJS({
        shops: {
          shops: [1, 2],
          shopsById: {
            1: {
              id: 1,
              channel_id: 1,
              name: 'foo'
            },
            2: {
              id: 2,
              channel_id: 1,
              name: 'bar'
            }
          },
          current: {
            id: 2,
            channel_id: 1,
            name: 'bar'
          },
          channelsById: {
            1: {
              id: 1,
              name: 'etsy'
            }
          }
        }
      });

      const setupOptions = applicationReducer.__get__('setupOptions');
      const state = setupOptions(reduction);
      expect(state.getIn(['shops', 'options']).toJS()).to.eql([{id: 2, channel_id: 1, name: 'bar', channel: 'etsy', _selected: true}, {id: 1, channel_id: 1, name: 'foo', channel: 'etsy', _selected: false}]);
    });
  });

  describe('navigateToShop', () => {
    const reduction = fromJS({
      shops: {
        shops: ['1', '2'],
        shopsById: {
          1: {
            id: '1',
            channel_id: '1',
            name: 'foo'
          },
          2: {
            id: '2',
            channel_id: '1',
            name: 'bar'
          }
        },
        channelsById: {
          1: {
            id: '1',
            name: 'etsy'
          }
        }
      }
    });

    it('should change url to existing shop', () => {
      const navigateToShop = applicationReducer.__get__('navigateToShop');
      const yields = navigateToShop(reduction, '2');

      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.callCount).to.eql(1);

      expect(dispatch.args[0]).to.eql([{type: 'Application.change_route', payload: '/etsy/2'}]);
    });

    it('should change url to first shop', () => {
      const navigateToShop = applicationReducer.__get__('navigateToShop');
      const yields = navigateToShop(reduction, '4');

      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.callCount).to.eql(1);

      expect(dispatch.args[0]).to.eql([{type: 'Application.change_route', payload: '/etsy/1'}]);
    });

    it('should do nothing if there are no shop data', () => {
      const navigateToShop = applicationReducer.__get__('navigateToShop');
      const yields = navigateToShop(fromJS({}), '4');

      const state = yields.next().value;
      expect(typeof state).to.eql('object');

      expect(state.toJS()).to.eql({});
    });
  });

  describe('handleShopImport', () => {
    afterEach(() => {
      applicationReducer.__ResetDependency__('Promise');
    });

    it('should make API calls', () => {
      const APICall = sinon.spy(() => ({then: (success) => success()}));
      applicationReducer.__Rewire__('APICall', APICall);

      const reduction = fromJS({});
      const handleShopImport = applicationReducer.__get__('handleShopImport');

      const yields = handleShopImport(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');
      yields.next();
      action(dispatch);

      expect(APICall.args.length).to.eql(2);
      applicationReducer.__ResetDependency__('APICall');
    });

    it('it should navigate to existing shop', () => {
      const profileResponse = {};
      const shopsResponse = {
        shops: ['1', '2'],
        shopsById: {
          1: {
            id: '1',
            channel_id: '1',
            name: 'foo',
            sync_status: SHOP_SYNC_STATUS_UPTODATE
          },
          2: {
            id: '2',
            channel_id: '1',
            name: 'bar',
            sync_status: SHOP_SYNC_STATUS_UPTODATE
          }
        },
        channelsById: {
          1: {
            id: '1',
            name: 'etsy'
          }
        }
      };

      const APICall = sinon.spy(() => ({then: (success) => success()}));
      applicationReducer.__Rewire__('APICall', APICall);
      applicationReducer.__Rewire__('Promise', { all: () => ({spread: (fce) => {fce(shopsResponse, profileResponse); return {catch: () => {} }; } }) });

      const reduction = fromJS({});
      const handleShopImport = applicationReducer.__get__('handleShopImport');

      const yields = handleShopImport(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.args.length).to.eql(3);

      const args = dispatch.args[2];

      expect(args[0]).to.eql({type: 'Application.set_shops_and_navigate', payload: {shops: shopsResponse}});
      applicationReducer.__ResetDependency__('APICall');
    });

    it('it should navigate to last seen shop', () => {
      const shopsResponse = {
        shops: ['1', '2'],
        shopsById: {
          1: {
            id: '1',
            channel_id: '1',
            name: 'foo',
            sync_status: SHOP_SYNC_STATUS_UPTODATE
          },
          2: {
            id: '2',
            channel_id: '1',
            name: 'bar',
            sync_status: SHOP_SYNC_STATUS_UPTODATE
          }
        },
        channelsById: {
          1: {
            id: '1',
            name: 'etsy'
          }
        }
      };
      const profileResponse = { last_seen_shop: { id: 1, channel: 'etsy' } };
      const APICall = sinon.spy(() => ({then: (success) => success(profileResponse)}));
      applicationReducer.__Rewire__('APICall', APICall);
      applicationReducer.__Rewire__('Promise', { all: () => ({spread: (fce) => {fce(shopsResponse, profileResponse); return {catch: () => {} }; } }) });

      const reduction = fromJS({});
      const handleShopImport = applicationReducer.__get__('handleShopImport');

      const yields = handleShopImport(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.args.length).to.eql(3);

      const args = dispatch.args[2];

      expect(args[0]).to.eql({type: 'Application.set_shops_and_navigate', payload: {shops: shopsResponse, shopId: 1}});
      applicationReducer.__ResetDependency__('APICall');
    });

    it('it should navigate to no shops screen if no shops', () => {
      const shopsResponse = {};
      const profileResponse = {};
      const APICall = sinon.spy(() => ({then: (success) => success(profileResponse)}));
      applicationReducer.__Rewire__('APICall', APICall);
      applicationReducer.__Rewire__('Promise', { all: () => ({spread: (fce) => {fce(shopsResponse, profileResponse); return {catch: () => {} }; } }) });

      const reduction = fromJS({});
      const handleShopImport = applicationReducer.__get__('handleShopImport');

      const yields = handleShopImport(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.args.length).to.eql(3);
      const args = dispatch.args[2];
      expect(args[0]).to.eql({type: 'Application.change_route', payload: '/welcome'});

      applicationReducer.__ResetDependency__('APICall');
    });

    it('it should navigate to welcome screen on API error', () => {
      const APICall = sinon.spy(() => ({then: (success, fail) => fail()}));
      applicationReducer.__Rewire__('APICall', APICall);
      applicationReducer.__Rewire__('Promise', { all: () => ({spread: () => ({catch: (err) => err() }) }) });

      const reduction = fromJS({});
      const handleShopImport = applicationReducer.__get__('handleShopImport');

      const yields = handleShopImport(reduction);
      const action = yields.next().value;
      expect(typeof action).to.eql('function');

      action(dispatch);
      expect(dispatch.args.length).to.eql(1);
      const args = dispatch.args;

      expect(args[0][0]).to.eql({type: 'Application.change_route', payload: '/'});

      applicationReducer.__ResetDependency__('APICall');
    });
  });
});
