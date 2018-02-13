import {expect} from 'chai';

import { validateInput, validate } from './materials';
import { fromJS } from 'immutable';

describe('MaterialsControls', () => {
  describe('validateInput', () => {
    it('should set no errors on single valid value', () => {
      const errors = validateInput({value: 'test ěščřžýáí 8289347'});

      expect(errors).to.eql({});
    });

    it('should set no errors on multiple (comma separated) valid values', () => {
      const errors = validateInput({value: 'test, weer, rrr, ěčšěč,ářžý'});

      expect(errors).to.eql({});
    });

    it('should handle empty materials', () => {
      const errors = validateInput({value: 'test,,,  ,     ,       ,  weer    , rrr'});

      expect(errors).to.eql({});
    });

    it('should set error if input contains other than allowed characters', () => {
      expect(!!validateInput({value: 'Only az 09'}).value).to.be.false;
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
    it('should set no error on valid materials array', () => {
      const errors = validate(fromJS({ materials: ['test', 'ěščřžýáí', '8289347'] }));

      expect(!!errors).to.be.false;
    });

    it('should set error on invalid materials', () => {
      const errors = validate(fromJS({ materials: ['test', 'ěščřžýáí', '8289347', '- ™©®'] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if materials are not unique', () => {
      const errors = validate(fromJS({ materials: ['test', 'ěščřžýáí', '8289347', 'ěščřžýáí'] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if materials are too long', () => {
      const longMaterial = new Array( 45 + 1 + 1 ).join( 'a' ); // 'a'.repeat(45 + 1);
      const errors = validate(fromJS({ materials: [longMaterial]}));

      expect(!!errors).to.be.true;
    });

    it('should set error if there is empty material', () => {
      const errors = validate(fromJS({ materials: ['test', ''] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if there is not trimed material', () => {
      const errors = validate(fromJS({ materials: ['foo', ' test '] }));

      expect(!!errors).to.be.true;
    });

    it('should set error if there are invalid characters in material', () => {
      expect(!!validate(fromJS({ materials: ['foo', 'test!'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test@'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test#'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test$'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test%'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test^'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test&'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test*'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test('] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test)'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test~'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test`'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test\\'] }))).to.be.true;
      expect(!!validate(fromJS({ materials: ['foo', 'test`'] }))).to.be.true;
    });
  });
});
