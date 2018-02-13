import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as quantityInventory from './quantityInventory';

describe('BulkEditOps - quantityInventory', () => {
  describe('apply', () => {
    let applyOps;
    let getApplyToSingle;
    let add;
    let sub;
    let set;
    let noop;

    beforeEach(() => {
      applyOps = sinon.stub();
      getApplyToSingle = sinon.stub();
      quantityInventory.__Rewire__('getApplyToSingle', getApplyToSingle);
      quantityInventory.__Rewire__('applyOps', applyOps);
      add = quantityInventory.__get__('add');
      sub = quantityInventory.__get__('sub');
      set = quantityInventory.__get__('set');
      noop = quantityInventory.__get__('noop');
    });

    afterEach(() => {
      quantityInventory.__ResetDependency__('applyOps');
      quantityInventory.__ResetDependency__('getApplyToSingle');
    });

    it('should increase quantity', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      quantityInventory.apply(product, BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(add);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY, 'quantity', product, opValue, false, 'opFn');
    });

    it('should decrease quantity', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      quantityInventory.apply(product, BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_DECREASE_BY, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(sub);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_DECREASE_BY, 'quantity', product, opValue, false, 'opFn');
    });

    it('should set quantity', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      quantityInventory.apply(product, BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_CHANGE_TO, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(set);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_CHANGE_TO, 'quantity', product, opValue, false, 'opFn');
    });

    it('should keep original quantity for unrecognized op', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      quantityInventory.apply(product, 'unknown op', opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(noop);
      expect(applyOps).to.have.been.calledWithExactly('unknown op', 'quantity', product, opValue, false, 'opFn');
    });

    it('should do nothing if inventory cannot be updated', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: false});

      expect(quantityInventory.apply(product, 'does not matter', opValue, true)).to.eql(product);

      expect(getApplyToSingle).to.not.have.been.called;
      expect(applyOps).to.not.have.been.called;
    });
  });
});
