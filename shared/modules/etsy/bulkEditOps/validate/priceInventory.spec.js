import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import * as priceInventory from './priceInventory';

describe('BulkEditOps - priceInventory validate', () => {
  describe('validatePrice', () => {
    let validatePrice;

    beforeEach(() => {
      validatePrice = priceInventory.__get__('validatePrice');
    });

    it('should be valid value', () => {
      expect(validatePrice('123.3')).to.be.null;
      expect(validatePrice('122')).to.be.null;
    });

    it('should require value', () => {
      expect(validatePrice('')).to.eql('Required');
      expect(validatePrice(null)).to.eql('Required');
      expect(validatePrice()).to.eql('Required');
    });

    it('should be positive number', () => {
      expect(validatePrice('-1.2')).to.eql('Must be positive number');
      expect(validatePrice('0')).to.eql('Must be positive number');
    });

    it('should be number', () => {
      expect(validatePrice('wwq')).to.eql('Must be a number');
      expect(validatePrice('$#W1212')).to.eql('Must be a number');
      expect(validatePrice('122$')).to.eql('Must be a number');
    });

    it('should ignore empty value', () => {
      expect(validatePrice('', true)).to.be.null;
      expect(validatePrice(null, true)).to.be.null;
    });

    it('should be smaller than max value', () => {
      expect(validatePrice('250000')).to.be.null;
      expect(validatePrice('250000.01')).to.eql('Must be lower than $250000');
      expect(validatePrice('250001')).to.eql('Must be lower than $250000');
    });
  });

  describe('validateInputField', () => {
    let validateInputField;

    beforeEach(() => {
      validateInputField = priceInventory.__get__('validateInputField');
    });

    it('should require value', () => {
      expect(validateInputField('')).to.eql('Required');
      expect(validateInputField(null)).to.eql('Required');
      expect(validateInputField()).to.eql('Required');
    });

    it('should be positive number', () => {
      expect(validateInputField('-1.2')).to.eql('Must be positive number');
      expect(validateInputField('-0.1')).to.eql('Must be positive number');
    });

    it('should be number', () => {
      expect(validateInputField('wwq')).to.eql('Must be a number');
      expect(validateInputField('$#W1212')).to.eql('Must be a number');
      expect(validateInputField('122$')).to.eql('Must be a number');
    });

    it('should be smaller than max value', () => {
      expect(validateInputField('250000')).to.be.null;
      expect(validateInputField('250000.01')).to.eql('Must be lower than $250000');
      expect(validateInputField('250001')).to.eql('Must be lower than $250000');
    });
  });

  describe('validateRoundingInputField', () => {
    let validateRoundingInputField;

    beforeEach(() => {
      validateRoundingInputField = priceInventory.__get__('validateRoundingInputField');
    });

    it('should allow empty value', () => {
      expect(validateRoundingInputField('')).to.be.null;
      expect(validateRoundingInputField()).to.be.null;
    });

    it('should be positive number', () => {
      expect(validateRoundingInputField('-1.2')).to.eql('Must be positive number');
      expect(validateRoundingInputField('-0.1')).to.eql('Must be positive number');
    });

    it('should be number between 0-100', () => {
      expect(validateRoundingInputField('0')).to.be.null;
      expect(validateRoundingInputField('99')).to.be.null;
      expect(validateRoundingInputField('qwe')).to.eql('Must be number between 0-100');
      expect(validateRoundingInputField('100')).to.eql('Must be number between 0-100');
      expect(validateRoundingInputField('1000')).to.eql('Must be number between 0-100');
    });

    it('should be int number', () => {
      expect(validateRoundingInputField('0')).to.be.null;
      expect(validateRoundingInputField('99')).to.be.null;
      expect(validateRoundingInputField('10.0')).to.eql('Must be int value');
      expect(validateRoundingInputField('10.4')).to.eql('Must be int value');
    });

    it('should be in valid format', () => {
      expect(validateRoundingInputField('0')).to.be.null;
      expect(validateRoundingInputField('00')).to.be.null;
      expect(validateRoundingInputField('99')).to.be.null;
      expect(validateRoundingInputField('010')).to.eql('Enter value in 0 or 00 format');
      expect(validateRoundingInputField('0001')).to.eql('Enter value in 0 or 00 format');
    });
  });

  describe('validate', () => {
    let validate;

    beforeEach(() => {
      validate = priceInventory.__get__('validate');
    });

    it('should be valid', () => {
      const product = fromJS({
        can_write_inventory: true,
        productOfferings: [
          { price: '3.14' },
          { price: '87.56' },
          { price: '23' },
          { price: '543' },
          { price: '0.25' }
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
          { price: '3.14' },
          { price: '-3.14' },
          { price: '3.14e' },
          { price: '' },
          { price: null }
        ]
      });

      expect(validate(product).toJS()).to.eql({
        valid: false,
        data: {
          status: null,
          offerings: [
            null,
            'Must be positive number',
            'Must be a number',
            'Required',
            'Must be a number'
          ]
        }
      });
    });

    it('should be valid if inventory cannot be updated', () => {
      const product = fromJS({ can_write_inventory: false });

      expect(validate(product).toJS()).to.eql({ valid: true });
    });
  });
});
