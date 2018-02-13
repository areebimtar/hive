import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import * as quantityInventory from './quantityInventory';

describe('BulkEditOps - quantityInventory validate', () => {
  describe('validateQuantity', () => {
    let validateQuantity;

    beforeEach(() => {
      validateQuantity = quantityInventory.__get__('validateQuantity');
    });

    it('should be valid value', () => {
      expect(validateQuantity('13')).to.be.null;
      expect(validateQuantity('122')).to.be.null;
    });

    it('should require value', () => {
      expect(validateQuantity('')).to.eql('Required');
      expect(validateQuantity(null)).to.eql('Required');
      expect(validateQuantity()).to.eql('Required');
    });

    it('should int number', () => {
      expect(validateQuantity('1.2')).to.eql('Use a whole number between 0 and 999');
      expect(validateQuantity('0.443')).to.eql('Use a whole number between 0 and 999');
      expect(validateQuantity('322.3')).to.eql('Use a whole number between 0 and 999');
    });

    it('should be non-negative number', () => {
      expect(validateQuantity('-45')).to.eql('Use a whole number between 0 and 999');
      expect(validateQuantity('-2.79')).to.eql('Use a whole number between 0 and 999');
      expect(validateQuantity('0')).to.eql(null);
    });

    it('should be number in between 0-1000', () => {
      expect(validateQuantity('1')).to.be.null;
      expect(validateQuantity('999')).to.be.null;
      expect(validateQuantity('1000')).to.eql('Use a whole number between 0 and 999');
      expect(validateQuantity('1212')).to.eql('Use a whole number between 0 and 999');
    });

    it('should ignore empty value', () => {
      expect(validateQuantity('', true)).to.be.null;
      expect(validateQuantity(null, true)).to.be.null;
    });

    it('should be positive global number', () => {
      expect(validateQuantity('0', true)).to.eql('At least one offering must be in stock');
    });
  });

  describe('validate', () => {
    let validate;

    beforeEach(() => {
      validate = quantityInventory.__get__('validate');
    });

    it('should be valid', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { quantity: '3' },
          { quantity: '87' },
          { quantity: '23' },
          { quantity: '543' },
          { quantity: '10' }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: true,
        data: {
          status: null,
          offerings: [null, null, null, null, null]
        }
      });
    });

    it('should not be valid', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { quantity: '3.14' },
          { quantity: '-3' },
          { quantity: '4e' },
          { quantity: '' },
          { quantity: null }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: false,
        data: {
          status: null,
          offerings: [
            'Use a whole number between 0 and 999',
            'Use a whole number between 0 and 999',
            'Use a whole number between 0 and 999',
            'Required',
            'Use a whole number between 0 and 999'
          ]
        }
      });
    });

    it('should be valid if there are some offerings out of stock', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { quantity: '34' },
          { quantity: '0' },
          { quantity: '4' },
          { quantity: '0' },
          { quantity: '33' }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: true,
        data: {
          status: null,
          offerings: [null, null, null, null, null]
        }
      });
    });

    it('should not be valid if all offerings are out of stock', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { quantity: '0' },
          { quantity: '0' },
          { quantity: '0' },
          { quantity: '0' },
          { quantity: '0' }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: false,
        data: {
          status: 'At least one offering must be in stock',
          offerings: [null, null, null, null, null]
        }
      });
    });

    it('If one quantity is invalid, it should not show global status', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { quantity: '' },
          { quantity: '0' },
          { quantity: '0' },
          { quantity: '0' },
          { quantity: '0' }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: false,
        data: {
          status: null,
          offerings: ['Required', null, null, null, null]
        }
      });
    });

    it('should be valid if inventory cannot be updated', () => {
      const product = fromJS({ can_write_inventory: false });

      expect(validate(product).toJS()).to.eql({ valid: true });
    });
  });
});
