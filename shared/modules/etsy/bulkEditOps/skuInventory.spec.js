import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as skuInventory from './skuInventory';

describe('BulkEditOps - skuInventory', () => {
  describe('apply', () => {
    let applyOps;
    let set;
    let prepend;
    let append;
    let noop;

    beforeEach(() => {
      applyOps = sinon.stub();
      skuInventory.__Rewire__('applyOps', applyOps);
      set = skuInventory.__get__('set');
      prepend = skuInventory.__get__('prepend');
      append = skuInventory.__get__('append');
      noop = skuInventory.__get__('noop');
    });

    afterEach(() => {
      skuInventory.__ResetDependency__('applyOps');
    });

    it('should set sku', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});

      skuInventory.apply(product, BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO, opValue, true);

      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO, 'sku', product, opValue, false, set);
    });

    it('should prepend text to sku', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});

      skuInventory.apply(product, BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE, opValue, true);

      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE, 'sku', product, opValue, false, prepend);
    });

    it('should set sku', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});

      skuInventory.apply(product, BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER, opValue, true);

      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER, 'sku', product, opValue, false, append);
    });

    it('should keep original sku for unrecognized op', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});

      skuInventory.apply(product, 'unknown op', opValue, true);

      expect(applyOps).to.have.been.calledWithExactly('unknown op', 'sku', product, opValue, false, noop);
    });

    it('should do nothing if inventory cannot be updated', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: false});

      expect(skuInventory.apply(product, 'does not matter', opValue, true)).to.eql(product);

      expect(applyOps).to.not.have.been.called;
    });
  });

  describe('formatter', () => {
    let formatter;

    beforeEach(() => {
      formatter = skuInventory.__get__('formatter');
    });

    it('should format add before', () => {
      const result = formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE, 'value', 'before');

      expect(result).to.eql('<span class="add">before</span>value');
    });

    it('should format add after', () => {
      const result = formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER, 'value', 'after');

      expect(result).to.eql('value<span class="add">after</span>');
    });

    it('should format find', () => {
      const result = formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE, 'value', {find: 'val'});

      expect(result).to.eql('<span class="replace">val</span>ue');
    });

    it('should format find and replace', () => {
      const result = formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE, 'value', {find: 'val', replace: 'bl'});

      expect(result).to.eql('<span class="add">bl</span>ue');
    });

    it('should format delete', () => {
      const result = formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE, 'value', 'al');

      expect(result).to.eql('v<span class="del">al</span>ue');
    });

    it('should not format value', () => {
      expect(formatter(BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO, 'value', 'al')).to.eql(null);
      expect(formatter('some op', 'value', 'al')).to.eql(null);
    });
  });
});
