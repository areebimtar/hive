import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import * as skuInventory from './skuInventory';

describe('BulkEditOps - skuInventory validate', () => {
  describe('validateSku', () => {
    let validateSku;

    beforeEach(() => {
      validateSku = skuInventory.__get__('validateSku');
    });

    it('should be valid value', () => {
      expect(validateSku('13')).to.be.null;
      expect(validateSku('asd-xcvxcv-23')).to.be.null;
    });

    it('should allow empty value', () => {
      expect(validateSku('')).to.be.null;
    });

    it('should not contain $^` characters', () => {
      expect(validateSku('abc $')).to.eql('Cannot contain $^` characters');
      expect(validateSku('abc ^')).to.eql('Cannot contain $^` characters');
      expect(validateSku('abc `')).to.eql('Cannot contain $^` characters');
      expect(validateSku('abc ` abc $ abc ^ abc')).to.eql('Cannot contain $^` characters');
    });

    it('should not allow more than 32 characters', () => {
      expect(validateSku('123456789012345678901234567890123', true)).to.eql('SKU can have at most 32 characters');
    });

    it('should allow 32 characters', () => {
      expect(validateSku('12345678901234567890123456789012', true)).to.be.null;
    });
  });
});
