import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as priceInventory from './priceInventory';

describe('BulkEditOps - priceInventory', () => {
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
      priceInventory.__Rewire__('getApplyToSingle', getApplyToSingle);
      priceInventory.__Rewire__('applyOps', applyOps);
      add = priceInventory.__get__('add');
      sub = priceInventory.__get__('sub');
      set = priceInventory.__get__('set');
      noop = priceInventory.__get__('noop');
    });

    afterEach(() => {
      priceInventory.__ResetDependency__('applyOps');
      priceInventory.__ResetDependency__('getApplyToSingle');
    });

    it('should increase price', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      priceInventory.apply(product, BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(add, true, false);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY, 'price', product, opValue, false, 'opFn');
    });

    it('should decrease price', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      priceInventory.apply(product, BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_DECREASE_BY, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(sub, true, false);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_DECREASE_BY, 'price', product, opValue, false, 'opFn');
    });

    it('should set price', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      priceInventory.apply(product, BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_CHANGE_TO, opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(set, true, false);
      expect(applyOps).to.have.been.calledWithExactly(BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_CHANGE_TO, 'price', product, opValue, false, 'opFn');
    });

    it('should keep original price for unrecognized op', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: true});
      getApplyToSingle.returns('opFn');

      priceInventory.apply(product, 'unknown op', opValue, true);

      expect(getApplyToSingle).to.have.been.calledWithExactly(noop, true, false);
      expect(applyOps).to.have.been.calledWithExactly('unknown op', 'price', product, opValue, false, 'opFn');
    });

    it('should do nothing if inventory cannot be updated', () => {
      const opValue = {};
      const product = fromJS({can_write_inventory: false});

      expect(priceInventory.apply(product, 'does not matter', opValue, true)).to.eql(product);

      expect(getApplyToSingle).to.not.have.been.called;
      expect(applyOps).to.not.have.been.called;
    });
  });

  describe('getApplyToSingle', () => {
    let getApplyToSingle;

    beforeEach(() => {
      getApplyToSingle = priceInventory.__get__('getApplyToSingle');
    });

    it('should apply absolute op', () => {
      const add = (v1, v2) => v1 + v2;
      const fn = getApplyToSingle(add, true);
      expect(fn(10, { value: 25 })).to.eql('35.00');
      expect(fn(10, { type: 'absolute', value: 25 })).to.eql('35.00');
    });

    it('should apply percentage op', () => {
      const add = (v1, v2) => v1 + v2;
      const fn = getApplyToSingle(add, true);
      expect(fn(10, { type: 'percentage', value: 25 })).to.eql('12.50');
    });

    it('should apply rounding', () => {
      const add = (v1, v2) => v1 + v2;
      const fn = getApplyToSingle(add, true);
      expect(fn(10, { value: 25, rounding: 34 })).to.eql('35.34');
    });

    it('should have two digits after comma', () => {
      const add = (v1, v2) => v1 + v2;
      const fn = getApplyToSingle(add);
      expect(fn(10, { type: 'percentage', value: 33 }).split('.').length).to.eql(2);
    });

    it('should not change input value if in inline edit mode', () => {
      const set = (v1, v2) => v2;
      const fn = getApplyToSingle(set, true, true);
      expect(fn(10, { value: '25' })).to.eql('25');
      expect(fn(10, { value: '12.' })).to.eql('12.');
      expect(fn(10, { value: '12.0' })).to.eql('12.0');
      expect(fn(10, { value: '5.00' })).to.eql('5.00');
      expect(fn(10, { value: '12.01' })).to.eql('12.01');
      expect(fn(10, { value: '2.25' })).to.eql('2.25');
      expect(fn(10, { value: '4.20' })).to.eql('4.20');
      expect(fn(10, { value: '4.200' })).to.eql('4.200');
      expect(fn(10, { value: '-2.25' })).to.eql('-2.25');
      expect(fn(10, { value: '.20' })).to.eql('.20');
      expect(fn(10, { value: '0.200' })).to.eql('0.200');
      expect(fn(10, { value: 'test' })).to.eql('test');
    });
  });

  describe('format', () => {
    let getOfferingsList;
    let format;

    beforeEach(() => {
      getOfferingsList = sinon.stub();
      priceInventory.__Rewire__('getOfferingsList', getOfferingsList);
      format = priceInventory.__get__('format');

      const product = fromJS({
        productOfferings: [
          { price: '1.00' },
          { price: '2.00' },
          { price: '3.00' }
        ]
      });

      format(product);
    });

    afterEach(() => {
      priceInventory.__ResetDependency__('getOfferingsList');
    });

    it('should add formatted value to each offering', () => {
      const expected = {
        productOfferings: [
          { price: '1.00', _formattedValue: '<span>$1.00</span>' },
          { price: '2.00', _formattedValue: '<span>$2.00</span>' },
          { price: '3.00', _formattedValue: '<span>$3.00</span>' }
        ]
      };
      const formattedProduct = getOfferingsList.args[0][1];
      expect(formattedProduct.toJS()).eql(expected);
    });

    it('should format offerings', () => {
      expect(getOfferingsList).to.have.been.calledOnce;
      expect(getOfferingsList.args[0][0]).eql(1);
      expect(getOfferingsList.args[0][1]).to.be.defined;
    });
  });

  describe('parseValue', () => {
    let parseValue;

    beforeEach(() => {
      parseValue = priceInventory.__get__('parseValue');
    });

    it('should pass through non-string value', () => {
      expect(parseValue(null)).to.eql(null);
      expect(parseValue(undefined)).to.eql(undefined);
    });

    it('should pass through empty string value', () => {
      expect(parseValue('')).to.eql('');
    });

    it('should pass through string value with characters', () => {
      expect(parseValue('123.43wew')).to.eql('123.43wew');
      expect(parseValue('12qq3.43')).to.eql('12qq3.43');
      expect(parseValue('qq123')).to.eql('qq123');
    });

    it('should handle negative values', () => {
      expect(parseValue('-123.12')).to.eql(-123.12);
      expect(parseValue('-12')).to.eql(-12);
      expect(parseValue('-')).to.eql('-');
      expect(parseValue('-qwe')).to.eql('-qwe');
    });

    it('should pass through value if there are too many periods', () => {
      expect(parseValue('123.43.12')).to.eql('123.43.12');
      expect(parseValue('12..43')).to.eql('12..43');
    });

    it('should parse value', () => {
      expect(parseValue('123.43')).to.eql(123.43);
      expect(parseValue('.45')).to.eql(0.45);
      expect(parseValue('0.12')).to.eql(0.12);
      expect(parseValue('.')).to.eql(0);
      expect(parseValue('-123.43')).to.eql(-123.43);
      expect(parseValue('-.45')).to.eql(-0.45);
    });

    it('should handle value which ends with period', () => {
      expect(parseValue('123.')).to.eql('123.');
      expect(parseValue('12.', true)).to.eql(12);
    });
  });
});
