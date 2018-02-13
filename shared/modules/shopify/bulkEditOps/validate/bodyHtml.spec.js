import {expect} from 'chai';

import { fromJS } from 'immutable';
import { validateInput, validate } from './bodyHtml';

describe('BodyHtml - validate', () => {
  describe('validateInput', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateInput({value: 'test'});

      expect(errors).to.eql({value: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateInput({value: ''});

      expect(!!errors.value).to.be.true;
    });

    it('should set error on empty html input', () => {
      const errors = validateInput({value: '<p><br></p>'});

      expect(!!errors.value).to.be.true;
    });
  });

  describe('validate', ()=> {
    it('should set no errors valid value', () => {
      const product = fromJS({ body_html: 'test' });
      const errors = validate(product);

      expect(!!errors).to.be.false;
    });

    it('should set error on empty input', () => {
      const product = fromJS({ body_html: '' });
      const errors = validate(product);

      expect(!!errors).to.be.true;
    });
  });
});
