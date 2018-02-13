import chai, {expect} from 'chai';
import { fromJS, Map } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import * as bulkEditReducer from './bulkEditReducer';
import * as BULKEDIT_CONSTANTS from 'app/client/constants/bulkEdit';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';

import { APPLY_PROGRESS_MODEL_SHORTEST_DURATION } from '../constants';

chai.use(sinonChai);

const CHANNEL_ID = 1;

describe('bulkEditReducer', () => {
  let dispatch;
  let Actions;
  let utilsMock;
  let uiUtil;
  let taxonomyUtils;

  beforeEach(() => {
    utilsMock = {
      bulkEdit: {
        validate: sinon.stub()
      },
      toggleProduct: sinon.stub(),
      getOfferings: sinon.stub(),
      getOfferingsData: sinon.stub(),
      toImmutable: sinon.stub()
    };

    Actions = {
      Application: {
        changeRoute: sinon.spy(),
        rescheduleShopsPoll: sinon.spy()
      },
      BulkEdit: {
        syncPendingChangesStarted: sinon.spy(),
        syncPendingChangesSucceeded: sinon.spy(),
        syncPendingChangesFailed: sinon.spy(),
        clearApplyOperationsInProgress: sinon.spy(),
        applyInlineEditOp: sinon.spy(),
        cancelInlineEditOp: sinon.spy(),
        setOperationAndValueAndApply: sinon.spy(),
        applyPreviewOp: sinon.spy(),
        applyOp: sinon.spy(),
        setValue: sinon.spy(),
        showDeleteVariationProfileModal: sinon.spy(),
        showEditProfileApplyModal: sinon.spy(),
        applyProfileTo: sinon.spy(),
        toggleProduct: sinon.spy(),
        reloadWithCurrentFilters: sinon.spy()
      }
    };

    uiUtil = {
      getUiState: sinon.stub(),
      getCustomPropertyIds: sinon.stub().returns([513, 514])
    };

    taxonomyUtils = {
      getIndexes: sinon.stub(),
      getValues: sinon.stub(),
      getOptions: sinon.stub()
    };

    bulkEditReducer.__Rewire__('utils', utilsMock);
    bulkEditReducer.__Rewire__('Actions', Actions);
    bulkEditReducer.__Rewire__('uiUtil', uiUtil);
    bulkEditReducer.__Rewire__('taxonomyUtils', taxonomyUtils);

    dispatch = sinon.spy();
  });

  afterEach(() => {
    bulkEditReducer.__ResetDependency__('utils');
    bulkEditReducer.__ResetDependency__('Actions');
    bulkEditReducer.__ResetDependency__('uiUtil');
    bulkEditReducer.__ResetDependency__('taxonomyUtils');
  });

  describe('selectMenuItem', () => {
    let reduction;
    let processFilteredData;
    let formatProducts;
    let getBulkMenuDefault;

    beforeEach(() => {
      reduction = fromJS({
        edit: {
          selectedMenuItem: 'title',
          previewOperation: { type: 'test', value: 'some value', blah: 'boo' },
          inlineEditOp: { type: 'test' },
          channelId: 11
        },
        combined: {
          form: {}
        }
      });
      processFilteredData = sinon.spy();
      formatProducts = sinon.stub();
      getBulkMenuDefault = sinon.stub().returns('preview op');
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__Rewire__('formatProducts', formatProducts);
      bulkEditReducer.__Rewire__('BULKEDIT_CONSTANTS', {DROPDOWN_DEFAULTS: {test: 'new_test_type'}});
      bulkEditReducer.__Rewire__('getBulkMenuDefault', getBulkMenuDefault);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
      bulkEditReducer.__ResetDependency__('formatProducts');
      bulkEditReducer.__ResetDependency__('BULKEDIT_CONSTANTS');
      bulkEditReducer.__ResetDependency__('getBulkMenuDefault');
    });

    it('should set new menu item', () => {
      const selectMenuItem = bulkEditReducer.__get__('selectMenuItem');

      const yields = selectMenuItem(reduction, 'test');

      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'selectedMenuItem'])).to.eql('test');
    });

    it('should clear preview operation and set default op type', () => {
      const selectMenuItem = bulkEditReducer.__get__('selectMenuItem');

      const yields = selectMenuItem(reduction, 'description');

      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'previewOperation'])).to.eql('preview op');

      expect(getBulkMenuDefault).to.have.been.calledOnce;
      expect(getBulkMenuDefault).to.have.been.calledWithExactly(11, 'description');
    });

    it('should clear inline edit operation', () => {
      const selectMenuItem = bulkEditReducer.__get__('selectMenuItem');

      const yields = selectMenuItem(reduction, 'test');

      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
    });

    it('should clear form data', () => {
      const selectMenuItem = bulkEditReducer.__get__('selectMenuItem');

      const yields = selectMenuItem(reduction, 'test');

      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['combined']).toJS()).to.eql({});
    });

    it('should format products data', () => {
      const selectMenuItem = bulkEditReducer.__get__('selectMenuItem');

      formatProducts.returns(fromJS(['product1', 'product2']));
      const yields = selectMenuItem(reduction, 'test');

      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'products']).toJS()).to.eql(['product1', 'product2']);
    });
  });

  describe('closeBulkEdit', () => {
    beforeEach(() => {
      Actions.Application.changeRoute = sinon.spy();
    });
    it('should close view', () => {
      const reduction = fromJS({
        edit: { pendingUpdates: false, channelId: 1, shopId: 'test_id' }
      });

      const closeBulkEdit = bulkEditReducer.__get__('closeBulkEdit');
      const yields = closeBulkEdit(reduction);

      const res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value(dispatch);
      Actions.Application.changeRoute.should.have.been.calledWithExactly('/etsy/test_id');
      const state = yields.next().value;
      expect(typeof state).not.to.eql('function');
      expect(state.getIn(['edit', 'previewOperation']).toJS()).to.eql({type: 'title.addBefore'});
      expect(state.getIn(['edit', 'selectedMenuItem'])).to.eql('title');
    });

    it('should open modal', () => {
      const reduction = fromJS({
        edit: { pendingUpdates: true }
      });

      const closeBulkEdit = bulkEditReducer.__get__('closeBulkEdit');
      const yields = closeBulkEdit(reduction);

      const res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      Actions.Application.changeRoute.should.not.have.been.called;
      expect(res.value.getIn(['edit', 'closeModalOpen'])).to.be.true;
    });
  });

  describe('syncPendingChanges', () => {
    beforeEach(() => {
      Actions.BulkEdit.syncPendingChangesStarted = sinon.spy();
      Actions.BulkEdit.syncPendingChangesFailed = sinon.spy();
      Actions.BulkEdit.clearApplyOperationsInProgress = sinon.spy();
      Actions.Application.rescheduleShopsPoll = sinon.spy();
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('APICall');
    });

    function runSyncPendingChange(reduction, closeModal) {
      const syncPendingChanges = bulkEditReducer.__get__('syncPendingChanges');
      const yields = syncPendingChanges(reduction, closeModal);
      // dispatching analytics call
      yields.next();
      let res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value(dispatch);
      Actions.Application.rescheduleShopsPoll.should.have.been.called;
      res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value(dispatch);
    }

    it('should make API call with ops', () => {
      const APICallMock = sinon.stub().returns({then: (handler) => { handler(); return {catch: (errorHandler) => errorHandler()}; }});
      bulkEditReducer.__Rewire__('APICall', APICallMock);

      const ops = [{type: 'test_type', products: [1, 2], vlaue: 'test_value'}];
      const reduction = fromJS({
        edit: { shopId: 'test_id', operations: ops, imageData: null }
      });
      runSyncPendingChange(reduction, false);

      APICallMock.should.have.been.calledWithExactly({method: 'put', url: '/shops/test_id/products', payload: ops});
    });

    it('should make API call with ops and pass closeBulkEditModal parametr', () => {
      const APICallMock = sinon.stub().returns({then: (handler) => { handler(); return {catch: (errorHandler) => errorHandler()}; }});
      bulkEditReducer.__Rewire__('APICall', APICallMock);

      const ops = [{type: 'test_type', products: [1, 2], vlaue: 'test_value'}];
      const reduction = fromJS({
        edit: { shopId: 'test_id', operations: ops, imageData: null }
      });
      runSyncPendingChange(reduction, true);

      APICallMock.should.have.been.calledWithExactly({method: 'put', url: '/shops/test_id/products', payload: ops});
    });

    it('should dispatch clearApplyOperationsInProgress message after successfull API call', () => {
      const APICallMock = sinon.stub().returns({then: (handler) => { handler(); return {catch: (errorHandler) => errorHandler()}; }});
      bulkEditReducer.__Rewire__('APICall', APICallMock);

      const ops = [{type: 'test_type', products: [1, 2], vlaue: 'test_value'}];
      const reduction = fromJS({
        edit: { shopId: 'test_id', operations: ops, imageData: null }
      });
      runSyncPendingChange(reduction, false);

      APICallMock.should.have.been.calledWithExactly({method: 'put', url: '/shops/test_id/products', payload: ops});
      Actions.BulkEdit.clearApplyOperationsInProgress.should.have.been.calledOnce;
    });
  });

  describe('syncPendingChangesStarted', () => {
    it('should set pendingUpdatesInProgress = true', () => {
      const reduction = fromJS({
        edit: { pendingUpdatesInProgress: false }
      });

      const syncPendingChangesStarted = bulkEditReducer.__get__('syncPendingChangesStarted');
      const yields = syncPendingChangesStarted(reduction);

      let res = yields.next();
      res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      expect(res.value.getIn(['edit', 'pendingUpdatesInProgress'])).to.be.true;
    });
  });

  describe('closeModal', () => {
    beforeEach(() => {
      Actions.Application.changeRoute = sinon.spy();
      Actions.BulkEdit.syncPendingChanges = sinon.spy();
    });
    it('should handle close', () => {
      const reduction = fromJS({
        edit: { products: 'products', operations: 'operations', previewOperation: 'previewOperation', channelId: 1, shopId: 'test_id' }
      });

      const closeModal = bulkEditReducer.__get__('closeModal');
      const yields = closeModal(reduction, BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.CLOSE);

      let res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value(dispatch);
      Actions.Application.changeRoute.should.have.been.calledWithExactly('/etsy/test_id');

      res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      expect(res.value.getIn(['edit', 'closeModalOpen'])).to.be.false;
      expect(res.value.getIn(['edit', 'operations']).toJS()).to.eql([]);
      expect(res.value.getIn(['edit', 'previewOperation']).toJS()).to.eql({type: 'title.addBefore'});
      expect(res.value.getIn(['edit', 'products']).toJS()).to.eql([]);
      expect(res.value.getIn(['edit', 'productsPreview']).toJS()).to.eql([]);

      Actions.BulkEdit.syncPendingChanges.should.not.have.been.called;
    });

    it('should handle keep editing', () => {
      const reduction = fromJS({
        edit: { products: 'products', productsPreview: 'productsPreview', operations: 'operations', previewOperation: 'previewOperation', shopType: 'test_type', shopId: 'test_id' }
      });

      const closeModal = bulkEditReducer.__get__('closeModal');
      const yields = closeModal(reduction, BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.KEEP_EDITING);

      const res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      expect(res.value.getIn(['edit', 'closeModalOpen'])).to.be.false;
      expect(res.value.getIn(['edit', 'operations'])).to.eql('operations');
      expect(res.value.getIn(['edit', 'previewOperation'])).to.eql('previewOperation');
      expect(res.value.getIn(['edit', 'products'])).to.eql('products');
      expect(res.value.getIn(['edit', 'productsPreview'])).to.eql('productsPreview');

      Actions.Application.changeRoute.should.not.have.been.called;
      Actions.BulkEdit.syncPendingChanges.should.not.have.been.called;
    });

    it('should handle sync update', () => {
      const reduction = fromJS({
        edit: { products: 'products', productsPreview: 'productsPreview', operations: 'operations', previewOperation: 'previewOperation', shopType: 'test_type', shopId: 'test_id' }
      });

      const closeModal = bulkEditReducer.__get__('closeModal');
      const yields = closeModal(reduction, BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.SYNC_UPDATES);

      let res = yields.next();
      expect(typeof res.value).to.eql('function');
      res.value(dispatch);
      Actions.BulkEdit.syncPendingChanges.should.have.been.calledWithExactly(true);

      res = yields.next();
      expect(typeof res.value).not.to.eql('function');
      expect(res.value.getIn(['edit', 'closeModalOpen'])).to.be.false;
      expect(res.value.getIn(['edit', 'operations'])).to.eql('operations');
      expect(res.value.getIn(['edit', 'previewOperation']).toJS()).to.eql({type: 'title.addBefore'});
      expect(res.value.getIn(['edit', 'products'])).to.eql('products');
      expect(res.value.getIn(['edit', 'productsPreview']).toJS()).to.eql([]);

      Actions.Application.changeRoute.should.not.have.been.called;
    });
  });

  describe('setInlineEditOp', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should set inline editing op', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: {} }
      });
      const op = {type: 'test_type', products: ['1']};

      const setInlineEditOp = bulkEditReducer.__get__('setInlineEditOp');

      const yields = setInlineEditOp(reduction, op);
      yields.next();
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'type'])).to.eql(op.type);
      expect(r.getIn(['edit', 'inlineEditOp', 'products']).toJS()).to.eql(op.products);
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.eql();
    });

    it('should set inline editing op and preview value', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: {}, selectedProducts: { 1: true }, previewOperation: { value: 'test preview value' } }
      });
      const op = {type: 'test_type', products: ['1']};

      const setInlineEditOp = bulkEditReducer.__get__('setInlineEditOp');

      const yields = setInlineEditOp(reduction, op);
      yields.next();
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'type'])).to.eql(op.type);
      expect(r.getIn(['edit', 'inlineEditOp', 'products']).toJS()).to.eql(op.products);
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.eql('test preview value');
    });

    it('should set offset for scroll to view', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: {}, selectedMenuItem: 'description' }
      });
      const op = {type: 'test_type', products: [1]};

      const setInlineEditOp = bulkEditReducer.__get__('setInlineEditOp');

      const yields = setInlineEditOp(reduction, op);
      yields.next();
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'type'])).to.eql(op.type);
      expect(r.getIn(['edit', 'inlineEditOp', 'products']).toJS()).to.eql(op.products);
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.eql();
      expect(r.getIn(['edit', 'tableScroll', 'productId'])).to.eql(1);
    });

    it('should not set previewValue if it is falsy (empty string)', () => {
      const reduction = fromJS({ edit: {
        inlineEditOp: {},
        selectedMenuItem: 'description',
        selectedProducts: { 1: true },
        previewOperation: { value: '' } // preview value '' should not be propagated
      }});
      const op = { type: 'test_type', products: [1]};

      bulkEditReducer.__get__('setInlineEditOp')(reduction, op).next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.be.undefined;
    });

    it('should not set offset for scroll to view', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: {}, selectedMenuItem: 'title' }
      });
      const op = {type: 'test_type', products: [1]};

      const setInlineEditOp = bulkEditReducer.__get__('setInlineEditOp');

      const yields = setInlineEditOp(reduction, op);
      yields.next();
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'type'])).to.eql(op.type);
      expect(r.getIn(['edit', 'inlineEditOp', 'products']).toJS()).to.eql(op.products);
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.eql();
      expect(r.getIn(['edit', 'tableScroll', 'productId'])).to.eql();
    });
  });

  describe('setInlineEditOpValue', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });
    it('should set inline editing value', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: { type: 'test_type', products: [1] } }
      });

      const setInlineEditOpValue = bulkEditReducer.__get__('setInlineEditOpValue');

      const yields = setInlineEditOpValue(reduction, 'test_value');
      yields.next();
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'value'])).to.eql('test_value');
    });
  });

  describe('hasChangedProperties', () => {
    let hasChangedProperties;

    beforeEach(() => {
      hasChangedProperties = bulkEditReducer.__get__('hasChangedProperties');
    });

    it('should return false if nothing changed', () => {
      const product = fromJS({ foo: 'bar', [FIELDS.SECTION_ID]: '123' });
      expect(hasChangedProperties(product, product)).to.be.false;
    });

    it('should return true if values are different', () => {
      const oldProduct = fromJS({ foo: 'bar' });
      const newProduct = fromJS({ foo: 'baar' });
      expect(hasChangedProperties(oldProduct, newProduct)).to.be.true;
    });

    it('should return true if values are missing', () => {
      const oldProduct = fromJS({ foo: 'bar' });
      const newProduct = fromJS({});
      expect(hasChangedProperties(oldProduct, newProduct)).to.be.true;
    });

    it('should compare even _HIVE_ properties', () => {
      const oldProduct = fromJS({ foo: 'bar', [FIELDS.SECTION_ID]: '123' });
      const newProduct = fromJS({ foo: 'bar', [FIELDS.SECTION_ID]: '999' });
      expect(hasChangedProperties(oldProduct, newProduct)).to.be.true;
    });

    it('should skip properties starting with _ but not with _HIVE_ properties', () => {
      const oldProduct = fromJS({ foo: 'bar', [FIELDS.SECTION_ID]: '123', _formatted: 'boo' });
      const newProduct = fromJS({ foo: 'bar', [FIELDS.SECTION_ID]: '123', _formatted: 'baa' });
      expect(hasChangedProperties(oldProduct, newProduct)).to.be.false;
    });
  });

  describe('applyInlineEdit', () => {
    let processFilteredData;
    let applyInlineEditOp;
    let applyOpOnProducts;
    let hasChangedProperties;

    beforeEach(() => {
      processFilteredData = sinon.spy();
      hasChangedProperties = sinon.stub().returns(true);
      applyInlineEditOp = sinon.stub().returns(fromJS({id: 1}));
      applyOpOnProducts = sinon.stub().returns('test products');
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__Rewire__('applyInlineEditOp', applyInlineEditOp);
      bulkEditReducer.__Rewire__('applyOpOnProducts', applyOpOnProducts);
      bulkEditReducer.__Rewire__('hasChangedProperties', hasChangedProperties);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
      bulkEditReducer.__ResetDependency__('applyInlineEditOp');
      bulkEditReducer.__ResetDependency__('applyOpOnProducts');
      bulkEditReducer.__ResetDependency__('hasChangedProperties');
    });

    function getInlineEditResult(reduction) {
      const applyInlineEdit = bulkEditReducer.__get__('applyInlineEdit');
      const yields = applyInlineEdit(reduction);
      // analytics call
      yields.next();
      return yields.next().value;
    }

    it('should apply inline editing op', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [], inlineEditOp: op, products: [{id: 1}] }
      });

      getInlineEditResult(reduction);
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([op]);
    });

    it('should apply inline editing op and deselect row', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test type' },
        selectedProducts: { 1: true }, products: [{id: '1'}]
      }});
      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([op]);
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(false);
    });


    it('should apply inline editing op and keep selected row state when previewOperation is empty', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [], inlineEditOp: op, previewOperation: {}, selectedProducts: { 1: true }, products: [{id: 1}] }
      });
      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([op]);
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(true);
    });


    it('should apply inline editing op and keep deselected row state', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [], inlineEditOp: op, previewOperation: {}, selectedProducts: { 1: false }, products: [{id: 1}] }
      });
      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([op]);
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(false);
    });

    it('should not deselect row if value is missing (ie. no edit was done yet)', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const selected = true;
      const op = { type: 'test_type', products: ['1']}; // the value field is missing
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test_type'},
        selectedProducts: { 1: selected },
        products: [{id: '1', title: 'old_value'}]
      }});

      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(selected);
    });

    it('should keep deselected row if value is missing', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const selected = false;
      const op = { type: 'test_type', products: ['1'], value: {}}; // the value field is empty
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test_type'},
        selectedProducts: { 1: selected },
        products: [{id: '1', title: 'old_value'}]
      }});

      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(selected);
    });

    it('should not apply inline editing op if value is missing', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const reduction = fromJS({
        edit: { operations: [], inlineEditOp: { type: 'test_type', products: [1] }, products: [{id: 1}] }
      });

      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
    });

    it('should append inline editing op to already applied ops', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [{type: 'op1'}, {type: 'op2'}], inlineEditOp: op, products: [{id: 1}] }
      });
      getInlineEditResult(reduction);

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([{type: 'op1'}, {type: 'op2'}, op]);
    });

    it('should not process inline edit op if resulting product would be invalid', () => {
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: false }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test type' },
        selectedProducts: { 1: true }, products: [{ id: '1'}]
      }});

      const applyInlineEdit = bulkEditReducer.__get__('applyInlineEdit');
      const yields = applyInlineEdit(reduction);
      // analytics call
      yields.next();
      // cancel inline editing
      const cancel = yields.next();
      cancel.value(dispatch);
      Actions.BulkEdit.cancelInlineEditOp.should.have.been.called;
      // get reduction
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql(op);
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(true);
    });

    it('should not apply inline edit op if there is no change in resultin product', () => {
      hasChangedProperties.returns(false);
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test type' },
        selectedProducts: { 1: true }, products: [{ id: '1'}]
      }});

      const applyInlineEdit = bulkEditReducer.__get__('applyInlineEdit');
      const yields = applyInlineEdit(reduction);
      // analytics call
      yields.next();
      // cancel inline editing
      const cancel = yields.next();
      cancel.value(dispatch);
      Actions.BulkEdit.cancelInlineEditOp.should.have.been.called;
      // get reduction
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql(op);
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
      expect(r.getIn(['edit', 'selectedProducts', '1'])).to.eql(true);
    });

    it('should not cancel inline edit op if still in inline edit but data are same', () => {
      hasChangedProperties.returns(false);
      utilsMock.bulkEdit.validate.returns(fromJS({ valid: true }));
      const op = { type: 'test_type', products: ['1'], value: 'test_value' };
      const reduction = fromJS({ edit: {
        operations: [], inlineEditOp: op, previewOperation: { type: 'test type' },
        selectedProducts: { 1: true }, products: [{ id: '1'}]
      }});

      const applyInlineEdit = bulkEditReducer.__get__('applyInlineEdit');
      const yields = applyInlineEdit(reduction, true);
      // analytics call
      yields.next();
      yields.next();
      // cancel inline editing
      Actions.BulkEdit.cancelInlineEditOp.should.not.have.been.called;
    });
  });

  describe('addOp', () => {
    let processFilteredData;
    let applyOpOnProducts;

    beforeEach(() => {
      processFilteredData = sinon.spy();
      applyOpOnProducts = sinon.stub().returns('products');
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__Rewire__('applyOpOnProducts', applyOpOnProducts);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
      bulkEditReducer.__ResetDependency__('applyOpOnProducts');
    });

    it('should set valid op', () => {
      const op = { type: 'test_type', products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [] }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([op]);
    });

    it('should add valid op', () => {
      const op = { type: 'test_type', products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [{type: 'op1'}, {type: 'op2'}] }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([{type: 'op1'}, {type: 'op2'}, op]);
    });

    it('should not set op missing product(s) id', () => {
      const op = { type: 'test_type', value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [] }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
    });

    it('should not set op missing type', () => {
      const op = { products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [] }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
    });

    it('should not set op missing value', () => {
      const op = { type: 'test_type', products: [1] };
      const reduction = fromJS({
        edit: { operations: [] }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'operations']).toJS()).to.eql([]);
    });

    it('should update products', () => {
      const op = { type: 'test_type', products: [1], value: 'test_value' };
      const reduction = fromJS({
        edit: { operations: [], products: 'test products', channelId: CHANNEL_ID }
      });

      const addOp = bulkEditReducer.__get__('addOp');

      const yields = addOp(reduction, op);
      yields.next();

      applyOpOnProducts.should.have.been.called;
      expect(applyOpOnProducts.args[0][0]).to.eql(CHANNEL_ID);
      expect(applyOpOnProducts.args[0][1]).to.eql('test products');
      expect(applyOpOnProducts.args[0][2].toJS()).to.eql([op]);
    });
  });

  describe('setOperationAndValue', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);

      const op = { type: BULK_EDIT_OP_CONSTS.TITLE_CHANGE_TO, value: {} };
      const reduction = fromJS({
        edit: {
          previewOperation: null,
          selectedProducts: { 1: true, 2: true, 3: false, 4: false }
        }
      });

      const setOperationAndValue = bulkEditReducer.__get__('setOperationAndValue');

      const yields = setOperationAndValue(reduction, op);
      yields.next();
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should set op', () => {
      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'previewOperation']).toJS()).not.to.be.null;
    });
  });

  describe('setSectionOperationAndValue', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should set existing section id', () => {
      const op = { type: 'test_type', value: '1' };
      const sectionsMap = { ids: [1, 2, 3], 1: 'section 1', 2: 'section 2', 3: 'section 3' };
      const reduction = fromJS({
        edit: {
          previewOperation: {},
          sectionsMap: sectionsMap
        }
      });

      const setSectionOperationAndValue = bulkEditReducer.__get__('setSectionOperationAndValue');

      const yields = setSectionOperationAndValue(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'previewOperation']).toJS()).to.eql(op);
      expect(r.getIn(['edit', 'sectionsMap']).toJS()).to.eql(sectionsMap);
      expect(r.getIn(['combined', 'form'])).to.eql(undefined);
    });

    it('should create new section id', () => {
      const op = { type: 'test_type', value: 'test' };
      const sectionsMap = { ids: [1, 2, 3], 1: 'section 1', 2: 'section 2', 3: 'section 3' };
      const resultSectionsMap = { ids: [1, 2, 3, 'test'], 1: 'section 1', 2: 'section 2', 3: 'section 3', test: 'test' };
      const reduction = fromJS({
        edit: {
          previewOperation: {},
          sectionsMap: sectionsMap
        }
      });

      const setSectionOperationAndValue = bulkEditReducer.__get__('setSectionOperationAndValue');

      const yields = setSectionOperationAndValue(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'previewOperation']).toJS()).to.eql(op);
      expect(r.getIn(['edit', 'sectionsMap']).toJS()).to.eql(resultSectionsMap);
      expect(r.getIn(['combined', 'form'])).to.eql(undefined);
    });

    it('should handle "none" as section id', () => {
      const op = { type: 'test_type', value: 'none' };
      const sectionsMap = { ids: [1, 2, 3], 1: 'section 1', 2: 'section 2', 3: 'section 3' };
      const reduction = fromJS({
        edit: {
          previewOperation: {},
          sectionsMap: sectionsMap
        }
      });

      const setSectionOperationAndValue = bulkEditReducer.__get__('setSectionOperationAndValue');

      const yields = setSectionOperationAndValue(reduction, op);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'previewOperation']).toJS()).to.eql(op);
      expect(r.getIn(['edit', 'sectionsMap']).toJS()).to.eql(sectionsMap);
      expect(r.getIn(['combined', 'form'])).to.eql(undefined);
    });
  });

  describe('setInlineEditOpValueAndApply', () => {
    it('should set new value', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: { value: 'test' } }
      });

      const setInlineEditOpValueAndApply = bulkEditReducer.__get__('setInlineEditOpValueAndApply');

      const yields = setInlineEditOpValueAndApply(reduction, 'foo');
      let res = yields.next();
      expect(res.value).to.be.function;
      expect(res.done).to.be.false;

      res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'inlineEditOp', 'value'])).to.eql('foo');
    });

    it('should dispatch applyInlineEditOp message', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: { value: 'test' } }
      });

      const setInlineEditOpValueAndApply = bulkEditReducer.__get__('setInlineEditOpValueAndApply');

      const yields = setInlineEditOpValueAndApply(reduction, 'foo');
      const res = yields.next();
      expect(res.value).to.be.function;
      expect(res.done).to.be.false;
      res.value(dispatch);
      Actions.BulkEdit.applyInlineEditOp.should.have.been.called;
    });
  });

  describe('setInlineEditOpAndApply', () => {
    let yields;

    beforeEach(() => {
      const reduction = fromJS({
        edit: { inlineEditOp: { type: 'foo', products: [1], value: 'test' } }
      });

      const setInlineEditOpAndApply = bulkEditReducer.__get__('setInlineEditOpAndApply');

      yields = setInlineEditOpAndApply(reduction, { type: 'bar', products: [2], value: 'new value' });
    });

    it('should set new value', () => {
      let res = yields.next();
      expect(res.value).to.be.function;
      expect(res.done).to.be.false;

      res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({ type: 'bar', products: [2], value: 'new value' });
    });

    it('should dispatch applyInlineEditOp message', () => {
      const res = yields.next();
      expect(res.value).to.be.function;
      expect(res.done).to.be.false;
      res.value(dispatch);
      Actions.BulkEdit.applyInlineEditOp.should.have.been.called;
    });
  });

  describe('appendInlineEditOpValue', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });
    it('should set new value', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: { value: ['test'] } }
      });

      const appendInlineEditOpValue = bulkEditReducer.__get__('appendInlineEditOpValue');

      utilsMock.toImmutable.returns('fooo');

      const yields = appendInlineEditOpValue(reduction, 'foo');
      const res = yields.next();
      expect(res.done).to.be.true;

      utilsMock.toImmutable.should.have.been.calledWithExactly('foo');

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp', 'value']).toJS()).to.eql(['test', 'fooo']);
    });
  });

  describe('cancelInlineEditOp', () => {
    let processFilteredData;
    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
    });
    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should clear inlineEditOp', () => {
      const reduction = fromJS({
        edit: { inlineEditOp: { a: 'test', b: [] } }
      });

      const cancelInlineEditOp = bulkEditReducer.__get__('cancelInlineEditOp');

      const yields = cancelInlineEditOp(reduction);
      yields.next();

      processFilteredData.should.have.been.called;
      const r = processFilteredData.args[0][0];
      expect(r.getIn(['edit', 'inlineEditOp']).toJS()).to.eql({});
    });
  });

  describe('setCarouselData', () => {
    it('should set carousel data', () => {
      const reduction = fromJS({
        edit: { photosCarousel: 'data' }
      });

      const setCarouselData = bulkEditReducer.__get__('setCarouselData');

      const yields = setCarouselData(reduction, {images: [], idx: 0});
      const res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'photosCarousel']).toJS()).to.eql({images: [], idx: 0});
    });

    it('should clear carousel data', () => {
      const reduction = fromJS({
        edit: { photosCarousel: 'data' }
      });

      const setCarouselData = bulkEditReducer.__get__('setCarouselData');

      const yields = setCarouselData(reduction, null);
      const res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'photosCarousel'])).to.eql(null);
    });
  });

  describe('setPhotosOp', () => {
    let processFilteredData;

    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__ResetDependency__('utils');
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should add op to list of operations', () => {
      const reduction = fromJS({
        edit: {
          imageData: { 1: 'test1', 2: 'test2', 3: 'test3'},
          previewOperation: {products: ['11']},
          operations: [],
          products: [{id: '11'}, {id: '22'}],
          channelId: CHANNEL_ID
        }
      });

      const setPhotosOp = bulkEditReducer.__get__('setPhotosOp');
      const op = { type: 'photos.add', value: [{sha: '3'}], products: ['11'] };

      const yields = setPhotosOp(reduction, op);
      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'operations']).toJS()).to.eql([op]);
    });
  });

  describe('setProductPreviewStatus', () => {
    let processFilteredData;

    beforeEach(() => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__ResetDependency__('utils');
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should set product preview data', () => {
      const reduction = fromJS({ edit: { productsPreviewStatus: { 2: { foo: 'bar' } } } });

      const setProductPreviewStatus = bulkEditReducer.__get__('setProductPreviewStatus');

      const yields = setProductPreviewStatus(reduction, {id: 1, data: {boo: 'bee'} });
      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'productsPreviewStatus']).toJS()).to.eql({1: {boo: 'bee'}, 2: { foo: 'bar' } });
    });

    it('should overwrite product preview data', () => {
      const reduction = fromJS({ edit: { productsPreviewStatus: { 1: { uff: 'grrrr' }, 2: { foo: 'bar' } } } });

      const setProductPreviewStatus = bulkEditReducer.__get__('setProductPreviewStatus');

      const yields = setProductPreviewStatus(reduction, {id: 1, data: {boo: 'bee'} });
      yields.next();
      const newState = processFilteredData.args[0][0];
      expect(newState.getIn(['edit', 'productsPreviewStatus']).toJS()).to.eql({1: {boo: 'bee'}, 2: { foo: 'bar' } });
    });
  });

  describe('clearTableBodyScrollPosition', () => {
    it('should return same reduction if there is nothing to clear', () => {
      const reduction = fromJS({ edit: {} });

      const clearTableBodyScrollPosition = bulkEditReducer.__get__('clearTableBodyScrollPosition');

      const yields = clearTableBodyScrollPosition(reduction);
      const res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value === reduction).to.be.true;
    });

    it('should clear scroll productId', () => {
      const reduction = fromJS({ edit: { tableScroll: {productId: '1'} } });

      const clearTableBodyScrollPosition = bulkEditReducer.__get__('clearTableBodyScrollPosition');

      const yields = clearTableBodyScrollPosition(reduction);
      const res = yields.next();
      expect(res.value).not.to.be.function;
      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'tableScroll'])).to.be.undefined;
    });
  });

  describe('toggleProduct', () => {
    let yields;
    let toggleProduct;
    let state;
    let processFilteredData;

    beforeEach(() => {
      state = fromJS({
        edit: {
          previewOperation: { type: BULK_EDIT_OP_CONSTS.TITLE_CHANGE_TO, value: { id: '12'} },
          selectedProducts: { 1: true, 2: true, 3: false, 4: false }
        }
      });

      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      toggleProduct = bulkEditReducer.__get__('toggleProduct');
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
    });

    it('should only toggle selected product', () => {
      utilsMock.toggleProduct.returns(state.deleteIn(['edit', 'previewOperation', 'value', 'id']));

      yields = toggleProduct(state, '123');
      yields.next();

      expect(processFilteredData).to.have.been.calledOnce;
    });
  });

  describe('getInventoryOpMeta', () => {
    let getInventoryOpMeta;
    let validateVariationsAndOfferings;
    let newValue;
    let uiState;

    beforeEach(() => {
      validateVariationsAndOfferings = sinon.stub().returns(fromJS({}));
      bulkEditReducer.__Rewire__('validateVariationsAndOfferings', validateVariationsAndOfferings);
      getInventoryOpMeta = bulkEditReducer.__get__('getInventoryOpMeta');
      newValue = fromJS({
        taxonomyId: 100,
        variations: [
          { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red' }, { value: 'BluE' }] }
        ]
      });

      uiState = new Map({
        availableOptions: fromJS([{ name: 'Red' }, { name: 'Green' }, { name: 'Blue' }]),
        optionFormatter: (value) => `${value} test`
      });
      uiUtil.getUiState.onCall(0).returns(uiState);
      uiUtil.getUiState.onCall(1).returns(fromJS({ availableOptions: [] }));
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('validateVariationsAndOfferings');
    });

    it('should setup meta data', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      const res = getInventoryOpMeta(0, newValue).toJS();

      expect(res.taxonomyData).to.be.defined;
      expect(res.variationsData).to.be.defined;
      expect(res.valid).to.be.defined;
    });

    it('should setup taxonomy meta data', () => {
      const indexes = ['0', '1'];
      const values = ['12', '23'];
      const options = ['45', '56'];
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      taxonomyUtils.getIndexes.returns(indexes);
      taxonomyUtils.getValues.returns(values);
      taxonomyUtils.getOptions.returns(options);

      const { taxonomyData } = getInventoryOpMeta(0, newValue).toJS();

      expect(taxonomyUtils.getIndexes).to.have.been.calledOnce;
      expect(taxonomyUtils.getValues).to.have.been.calledOnce;
      expect(taxonomyUtils.getOptions).to.have.been.calledOnce;
      expect(taxonomyData.indexes).to.eql(indexes);
      expect(taxonomyData.values).to.eql(values);
      expect(taxonomyData.options).to.eql(options);
    });

    it('should add empty (placeholder) variation', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      uiUtil.getUiState.onCall(0).returns(fromJS({ availableOptions: [] }));
      const expected = [{
        key: 'undefined.undefined',
        uiState: { availableOptions: [] },
        variation: { options: [] },
        validity: null,
        taxonomyId: 100,
        canEnableDelete: false,
        disabledPropertyId: undefined
      }];
      const { variationsData } = getInventoryOpMeta(0, fromJS({ taxonomyId: 100, variations: [] })).toJS();

      expect(variationsData.variations).to.eql(expected);
    });

    it('should add second empty (placeholder) variation', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      const { variationsData } = getInventoryOpMeta(0, newValue).toJS();

      expect(variationsData.variations.length).to.eql(2);
    });

    it('should setup variations meta data', () => {
      validateVariationsAndOfferings.onCall(0).returns(fromJS({data: [{data: {variations: [{status: 'error'}, {status: null}]}}]}));
      const expected = [{
        key: '12345.1',
        uiState: { availableOptions: [{ name: 'Red', selected: true }, { name: 'Green', selected: false }, { name: 'Blue', selected: true }], optionFormatter: uiState.get('optionFormatter') },
        variation: { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red', label: 'red test' }, { value: 'BluE', label: 'BluE test' }] },
        validity: 'error',
        taxonomyId: 100,
        canEnableDelete: true,
        disabledPropertyId: undefined
      }, {
        key: 'undefined.undefined',
        uiState: { availableOptions: [] },
        variation: { options: [] },
        validity: null,
        taxonomyId: 100,
        canEnableDelete: false,
        disabledPropertyId: 12345
      }];

      const { variationsData } = getInventoryOpMeta(0, newValue).toJS();

      expect(uiUtil.getUiState).to.have.been.calledTwice;

      expect(variationsData.variations).to.eql(expected);
    });
  });

  describe('getInventoryOpMeta', () => {
    let getInventoryOpMeta;
    let validateVariationsAndOfferings;
    let newValue;
    let uiState;

    beforeEach(() => {
      validateVariationsAndOfferings = sinon.stub().returns(fromJS({}));
      bulkEditReducer.__Rewire__('validateVariationsAndOfferings', validateVariationsAndOfferings);
      getInventoryOpMeta = bulkEditReducer.__get__('getInventoryOpMeta');
      newValue = fromJS({
        taxonomyId: 100,
        variations: [
          { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red' }, { value: 'BluE' }] }
        ]
      });

      uiState = new Map({
        availableOptions: fromJS([{ name: 'Red' }, { name: 'Green' }, { name: 'Blue' }]),
        optionFormatter: (value) => `${value} test`
      });
      uiUtil.getUiState.onCall(0).returns(uiState);
      uiUtil.getUiState.onCall(1).returns(fromJS({ availableOptions: [] }));
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('validateVariationsAndOfferings');
    });

    it('should setup meta data', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      const res = getInventoryOpMeta(0, newValue);

      expect(res.taxonomyData).to.be.defined;
      expect(res.variationsData).to.be.defined;
      expect(res.valid).to.be.defined;
    });

    it('should setup taxonomy meta data', () => {
      const indexes = ['0', '1'];
      const values = ['12', '23'];
      const options = ['45', '56'];
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      taxonomyUtils.getIndexes.returns(indexes);
      taxonomyUtils.getValues.returns(values);
      taxonomyUtils.getOptions.returns(options);

      const metaData = getInventoryOpMeta(0, newValue);

      expect(taxonomyUtils.getIndexes).to.have.been.calledOnce;
      expect(taxonomyUtils.getValues).to.have.been.calledOnce;
      expect(taxonomyUtils.getOptions).to.have.been.calledOnce;
      expect(metaData.getIn(['taxonomyData', 'indexes']).toJS()).to.eql(indexes);
      expect(metaData.getIn(['taxonomyData', 'values']).toJS()).to.eql(values);
      expect(metaData.getIn(['taxonomyData', 'options']).toJS()).to.eql(options);
    });

    it('should add empty (placeholder) variation', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      uiUtil.getUiState.onCall(0).returns(fromJS({ availableOptions: [] }));
      const expected = [{
        key: 'undefined.undefined',
        uiState: { availableOptions: [] },
        variation: { options: [] },
        validity: null,
        taxonomyId: 100,
        canEnableDelete: false,
        disabledPropertyId: undefined
      }];
      const metaData = getInventoryOpMeta(0, fromJS({ taxonomyId: 100, variations: [] }));

      expect(metaData.getIn(['variationsData', 'variations']).toJS()).to.eql(expected);
    });

    it('should add second empty (placeholder) variation', () => {
      validateVariationsAndOfferings.returns(fromJS({valid: true}));
      const metaData = getInventoryOpMeta(0, newValue);

      expect(metaData.getIn(['variationsData', 'variations']).size).to.eql(2);
    });

    it('should setup variations meta data', () => {
      validateVariationsAndOfferings.onCall(0).returns(fromJS({data: [{data: {variations: [{status: 'error'}, {status: null}]}}]}));
      const expected = [{
        key: '12345.1',
        uiState: { availableOptions: [{ name: 'Red', selected: true }, { name: 'Green', selected: false }, { name: 'Blue', selected: true }], optionFormatter: uiState.get('optionFormatter') },
        variation: { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red', label: 'red test' }, { value: 'BluE', label: 'BluE test' }] },
        validity: 'error',
        taxonomyId: 100,
        canEnableDelete: true,
        disabledPropertyId: undefined
      }, {
        key: 'undefined.undefined',
        uiState: { availableOptions: [] },
        variation: { options: [] },
        validity: null,
        taxonomyId: 100,
        canEnableDelete: false,
        disabledPropertyId: 12345
      }];

      const metaData = getInventoryOpMeta(0, newValue);

      expect(uiUtil.getUiState).to.have.been.calledTwice;

      expect(metaData.getIn(['variationsData', 'variations']).toJS()).to.eql(expected);
    });

    it('should set valid flag to false on bad variation', () => {
      validateVariationsAndOfferings.returns(fromJS({ valid: false }));
      const metaData = getInventoryOpMeta(0, newValue);

      expect(metaData.get('valid')).to.be.false;
    });
  });

  describe('setInventoryOpValue', () => {
    let setInventoryOpValue;
    let processFilteredData;
    let getInventoryOpMeta;
    let fixVariationsPropertyIds;
    let newValue;

    beforeEach(() => {
      newValue = fromJS({
        taxonomyId: 100,
        variations: [
          null,
          { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red' }, { value: 'BluE' }] }
        ]
      });

      const fixed = fromJS({
        taxonomyId: 100,
        variations: [
          { id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red' }, { value: 'BluE' }] }
        ]
      });

      getInventoryOpMeta = sinon.stub();
      bulkEditReducer.__Rewire__('getInventoryOpMeta', getInventoryOpMeta);
      fixVariationsPropertyIds = sinon.stub().returns(fixed);
      bulkEditReducer.__Rewire__('fixVariationsPropertyIds', fixVariationsPropertyIds);
      processFilteredData = reduction => reduction;
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      setInventoryOpValue = bulkEditReducer.__get__('setInventoryOpValue');
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('getInventoryOpMeta');
      bulkEditReducer.__ResetDependency__('processFilteredData');
      bulkEditReducer.__ResetDependency__('fixVariationsPropertyIds');
    });

    it('should set preview op data', () => {
      const value = setInventoryOpValue(fromJS({}), 'previewOperation', newValue);

      expect(value.getIn(['edit', 'previewOperation', 'value']).toJS()).to.be.defined;
    });

    it('should set op meta data', () => {
      getInventoryOpMeta.returns({ some: 'data' });
      const value = setInventoryOpValue(fromJS({}), 'previewOperation', newValue);

      expect(getInventoryOpMeta).to.have.been.calledOnce;
      expect(value.getIn(['edit', 'previewOperation', 'meta']).toJS()).to.be.defined;
    });

    it('should delete null variation', () => {
      const value = setInventoryOpValue(fromJS({}), 'previewOperation', newValue);

      expect(value.getIn(['edit', 'previewOperation', 'value', 'variations']).toJS()).to.eql([{ id: -1, propertyId: 12345, scalingOptionId: 1, options: [{ value: 'red' }, { value: 'BluE' }] }]);
    });

    it('should call fixVariationsPropertyIds', () => {
      setInventoryOpValue(fromJS({}), 'previewOperation', newValue);

      expect(fixVariationsPropertyIds).to.have.been.calledOnce;
    });
  });

  describe('setPreviewOpMetadata', () => {
    let setPreviewOpMetadata;
    let processFilteredData;
    let getInventoryOpMeta;

    beforeEach(() => {
      processFilteredData = reduction => reduction;
      getInventoryOpMeta = sinon.stub().returns(fromJS({}));
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);
      bulkEditReducer.__Rewire__('getInventoryOpMeta', getInventoryOpMeta);
      setPreviewOpMetadata = bulkEditReducer.__get__('setPreviewOpMetadata');
    });

    afterEach(() => {
      bulkEditReducer.__ResetDependency__('processFilteredData');
      bulkEditReducer.__ResetDependency__('getInventoryOpMeta');
    });

    it('should merge new meta data with existing ones', () => {
      const yields = setPreviewOpMetadata(fromJS({ edit: { previewOperation: { meta: { old: 'data' } } } }), fromJS({ new: 'data' }));
      const { value } = yields.next();

      expect(value.getIn(['edit', 'previewOperation', 'meta']).toJS()).to.eql({ old: 'data', new: 'data' });
    });

    it('should call processFilteredData', () => {
      processFilteredData = sinon.spy();
      bulkEditReducer.__Rewire__('processFilteredData', processFilteredData);

      const yields = setPreviewOpMetadata(fromJS({ edit: { previewOperation: { meta: { old: 'data' } } } }), fromJS({ new: 'data' }));
      yields.next();

      expect(processFilteredData).to.have.been.calledOnce;
    });
  });

  describe('fixVariationsPropertyIds', () => {
    let fixVariationsPropertyIds;

    beforeEach(() => {
      fixVariationsPropertyIds = bulkEditReducer.__get__('fixVariationsPropertyIds');
    });

    it('should use first custom property', () => {
      let value;

      value = fromJS({variations: [{propertyId: null, isCustomProperty: true}, {propertyId: null, isCustomProperty: false}]});
      expect(fixVariationsPropertyIds(value).toJS()).to.eql({variations: [{propertyId: 513, isCustomProperty: true}, {propertyId: null, isCustomProperty: false}]});

      value = fromJS({variations: [{propertyId: 123, isCustomProperty: false}, {propertyId: null, isCustomProperty: true}]});
      expect(fixVariationsPropertyIds(value).toJS()).to.eql({variations: [{propertyId: 123, isCustomProperty: false}, {propertyId: 513, isCustomProperty: true}]});
    });

    it('should use both custom properties', () => {
      const value = fromJS({variations: [{propertyId: null, isCustomProperty: true}, {propertyId: null, isCustomProperty: true}]});
      expect(fixVariationsPropertyIds(value).toJS()).to.eql({variations: [{propertyId: 513, isCustomProperty: true}, {propertyId: 514, isCustomProperty: true}]});
    });

    it('should re-assign custom properties', () => {
      const value = fromJS({variations: [{propertyId: 514, isCustomProperty: true}, {propertyId: null, isCustomProperty: true}]});
      expect(fixVariationsPropertyIds(value).toJS()).to.eql({variations: [{propertyId: 513, isCustomProperty: true}, {propertyId: 514, isCustomProperty: true}]});
    });
  });

  describe('setApplyProgressModalShown', () => {
    let clock;
    let setApplyProgressModalShown;

    beforeEach(() => {
      clock = sinon.useFakeTimers(1);
      setApplyProgressModalShown = bulkEditReducer.__get__('setApplyProgressModalShown');
    });

    afterEach(() => {
      clock.restore();
    });

    it('sets flag to show the modal', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: false
          }
        }
      });

      const yields = setApplyProgressModalShown(reduction, true);
      let res = undefined;
      while (!res || !res.done) {
        res = yields.next();
      }
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.true;
    });

    it('resets progress before setting shown flag to true', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: false,
            progress: 5,
            total: 10
          }
        }
      });

      const setApplyProgressModalProgress = sinon.spy();

      bulkEditReducer.__Rewire__('Actions', { BulkEdit: { setApplyProgressModalProgress } });

      const yields = setApplyProgressModalShown(reduction, true);
      const res = yields.next();
      const action = res.value;
      expect(res.done).to.be.false;
      expect(typeof action).to.eql('function');
      action(dispatch);
      setApplyProgressModalProgress.should.have.been.calledWithExactly({ progress: 0, total: 0 });

      bulkEditReducer.__ResetDependency__('Actions');
    });

    it('sets flag to hide the modal after minimal duration', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: false
          }
        }
      });

      // First show the modal
      const yields = setApplyProgressModalShown(reduction, true);
      let res = undefined;
      while (!res || !res.done) {
        res = yields.next();
      }
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.true;
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shownAt'])).to.be.above(0);

      // Move clock after the minimal dialog duration
      clock.tick(APPLY_PROGRESS_MODEL_SHORTEST_DURATION + 20);

      // Now hide it after the minimal duration, this should work since the limit was reached
      const yieldsHide = setApplyProgressModalShown(res.value, false);
      let resHide = undefined;
      while (!resHide || !resHide.done) {
        resHide = yieldsHide.next();
      }
      expect(resHide.value.getIn(['edit', 'applyProgressModal', 'shownAt'])).to.be.above(0);
      expect(resHide.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.false;
    });

    it('should reload products with current filters', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: true,
            shownAt: 0
          },
          syncUpdates: {
            closeBulkEditModal: false
          }
        }
      });

      // Move clock after the minimal dialog duration
      clock.tick(APPLY_PROGRESS_MODEL_SHORTEST_DURATION + 20);

      // Now hide it after the minimal duration, this should work since the limit was reached
      let yields = setApplyProgressModalShown(reduction, false);
      yields = yields.next();

      yields.value(dispatch);
      expect(Actions.BulkEdit.reloadWithCurrentFilters).to.have.been.calledOnce;
    });

    it('should close bulk edit modal and navigate to shop view', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: true,
            shownAt: 0
          },
          syncUpdates: {
            closeBulkEditModal: true
          },
          channelId: 1,
          shopId: 123
        }
      });

      // Move clock after the minimal dialog duration
      clock.tick(APPLY_PROGRESS_MODEL_SHORTEST_DURATION + 20);

      // Now hide it after the minimal duration, this should work since the limit was reached
      let yields = setApplyProgressModalShown(reduction, false);
      yields = yields.next();

      yields.value(dispatch);
      expect(Actions.Application.changeRoute).to.have.been.calledOnce;
      expect(Actions.Application.changeRoute).to.have.been.calledWithExactly('/etsy/123');
    });

    it('does not set the flag to hide the modal before the minimal duration', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: false
          }
        }
      });

      // First show the modal
      const yields = setApplyProgressModalShown(reduction, true);
      let res = undefined;
      while (!res || !res.done) {
        res = yields.next();
      }
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.true;
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shownAt'])).to.be.above(0);

      // Move time forward, but less than minimal modal duration
      clock.tick(APPLY_PROGRESS_MODEL_SHORTEST_DURATION / 2);

      // Now immediatelly hide it, this should not work as there is the time limit
      const yieldsHide = setApplyProgressModalShown(res.value, false);
      let resHide = undefined;
      while (!resHide || !resHide.done) {
        resHide = yieldsHide.next();
      }
      // The value is still true since modal cannot be hidden
      expect(resHide.value.getIn(['edit', 'applyProgressModal', 'shownAt'])).to.be.above(0);
      expect(resHide.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.true;
    });
  });

  describe('setApplyProgressModalProgress', () => {
    it('properly sets progress', () => {
      const reduction = fromJS({
        edit: {
          applyProgressModal: {
            shown: true,
            progress: 0,
            total: 0
          }
        }
      });

      const setApplyProgressModalProgress =
        bulkEditReducer.__get__('setApplyProgressModalProgress');

      const progress = 5;
      const total = 10;

      const yields = setApplyProgressModalProgress(reduction, { progress: progress, total: total});
      const res = yields.next();

      expect(res.done).to.be.true;
      expect(res.value.getIn(['edit', 'applyProgressModal', 'shown'])).to.be.true;
      expect(res.value.getIn(['edit', 'applyProgressModal', 'progress'])).to.eql(progress);
      expect(res.value.getIn(['edit', 'applyProgressModal', 'total'])).to.eql(total);
    });
  });
});
