import {expect} from 'chai';

import module, { validateInput, validate } from './tags';
import { fromJS } from 'immutable';

describe('Shopify - TagsControls', () => {
  beforeEach(() => {
    module.__Rewire__('BULK_EDIT_VALIDATIONS', { TAG_MAX_LENGTH: 20 });
  });

  afterEach(() => {
    module.__ResetDependency__('BULK_EDIT_VALIDATIONS');
  });

  describe('validateInput', () => {
    it('should set no errors on single valid value', () => {
      const errors = validateInput({value: 'test 123 ěščřžýáí'});

      expect(errors).to.eql({});
    });

    it('should set no errors on multiple (comma separated) valid values', () => {
      const errors = validateInput({value: 'test, women\'s, rrr, ěčšěč,ářžý,t-shirt'});

      expect(errors).to.eql({});
    });

    it('should handle empty tags', () => {
      const errors = validateInput({value: 'test,,,  ,     ,       ,  weer    , rrr'});

      expect(errors).to.eql({});
    });

    it('should set error if input has more than 20 characters', () => {
      expect(!!validateInput({value: '123456789012345678901'}).value).to.be.true;
    });

    it('should set error if input contains other than allowed characters', () => {
      expect(!!validateInput({value: 'Only a-z, 90\'s'}).value).to.be.false;
      expect(!!validateInput({value: 'sdf#'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf@'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf$'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf^'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf*'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf|'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf['}).value).to.be.true;
      expect(!!validateInput({value: 'sdf]'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf<'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf>'}).value).to.be.true;
      expect(!!validateInput({value: 'sdf~'}).value).to.be.true;
    });
  });

  describe('validate', () => {
    it('should set no error on valid tags array', () => {
      const errors = validate(fromJS({ tags: ['test', 'ěščřžýáí', '8289347'] }));

      expect(!!errors).to.be.false;
    });

    it('should not set error if tags are not valid', () => {
      const errors = validate(fromJS({ tags: ['valid', '- ™©®'] }));

      expect(!!errors).to.be.false; // HIVE-538
    });

    it('should set error if tags are not unique', () => {
      const errors = validate(fromJS({ tags: ['test', 'ěščřžýáí', '8289347', '- ™©®', 'ěščřžýáí'] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if there is empty tag', () => {
      const errors = validate(fromJS({ tags: ['test', ''] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if there is not trimed tag', () => {
      const errors = validate(fromJS({ tags: ['foo', ' test '] }));

      expect(!!errors).to.be.true;
    });
  });
});
