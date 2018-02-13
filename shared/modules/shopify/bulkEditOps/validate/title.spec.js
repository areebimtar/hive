import { expect } from 'chai';

import { validateAddBefore, validateAddAfter, validateReplace } from './title';

describe('Shopify TitleControls - validate', () => {
  describe('validateAddBefore', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateAddBefore({value: 'test'});

      expect(errors).to.eql({value: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateAddBefore({value: ''});

      expect(!!errors.value).to.be.true;
    });
  });

  describe('validateAddAfter', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateAddAfter({value: 'test'});

      expect(errors).to.eql({value: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateAddAfter({value: ''});

      expect(!!errors.value).to.be.true;
    });
  });

  describe('validateReplace', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateReplace({replace: 'test'});

      expect(errors).to.eql({replace: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateReplace({replace: ''});

      expect(!!errors.replace).to.be.true;
    });
  });
});
