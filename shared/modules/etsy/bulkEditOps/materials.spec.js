import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as materials from './materials';

describe('BulkEditOps - Materials', () => {
  describe('apply', () => {
    describe('add op', () => {
      it('should not change original product', () => {
        const product = fromJS({ materials: ['test'] });
        materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, {value: 'foo, bar, baz, boo'});

        expect(product.toJS()).to.eql({ materials: ['test'] });
      });

      it('should add new material', () => {
        const product = fromJS({ materials: ['test'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, 'foo');

        expect(result.get('materials').toJS()).to.eql(['test', 'foo']);
      });

      it('should add multiple materials', () => {
        const product = fromJS({ materials: ['test'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, 'foo, bar, baz, boo');

        expect(result.get('materials').toJS()).to.eql(['test', 'foo', 'bar', 'baz', 'boo']);
      });

      it('should not add materials on bad value input', () => {
        const product = fromJS({ materials: ['test'] });
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD).get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, '').get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, null).get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, {w: 'ee'}).get('materials').toJS()).to.eql(['test']);
      });

      it('should format materials', () => {
        const product = fromJS({ materials: ['test'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, 'foo, bar');

        expect(result.get('_formattedMaterials').toJS()).to.eql([{name: 'test', status: 'material'}, {name: 'foo', status: 'add'}, {name: 'bar', status: 'add'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ materials: ['test'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_ADD, 'new material', true);

        expect(result._formattedTitle).to.be.undefined;
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ materials: ['test'] });
        materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, {value: 'test'});

        expect(product.toJS()).to.eql({ materials: ['test'] });
      });

      it('should delete material', () => {
        const product = fromJS({ materials: ['test', 'foo'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, 'foo');

        expect(result.get('materials').toJS()).to.eql(['test']);
      });

      it('should delete multiple materials', () => {
        const product = fromJS({ materials: ['test', 'foo', 'bar', 'baz', 'boo'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, 'foo,  , boo');

        expect(result.get('materials').toJS()).to.eql(['test', 'bar', 'baz']);
      });

      it('should not delete materials on bad value input', () => {
        const product = fromJS({ materials: ['test'] });
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE).get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, '').get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, null).get('materials').toJS()).to.eql(['test']);
        expect(materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, {w: 'ee'}).get('materials').toJS()).to.eql(['test']);
      });

      it('should format materials', () => {
        const product = fromJS({ materials: ['test', 'foo'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, 'foo');

        expect(result.get('_formattedMaterials').toJS()).to.eql([{name: 'test', status: 'material'}, {name: 'foo', status: 'del'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ materials: ['test'] });
        const result = materials.apply(product, BULK_EDIT_OP_CONSTS.MATERIALS_DELETE, 'test', true);

        expect(result._formattedTitle).to.be.undefined;
      });
    });
  });

  describe('validate', () => {
    it('should throw error on bad input', () => {
      const inputs = [null, undefined, fromJS({}), 0, 123, '', 'qweq'];
      let errs = 0;
      _.each(inputs, input => {
        try {
          materials.validate(input);
        } catch (error) {
          errs++;
        }
      });

      expect(errs).to.eql(inputs.length);
    });

    it('should validate materials', () => {
      materials.__Rewire__('BULK_EDIT_VALIDATIONS', {MATERIALS_MAX_LENGTH: 5});
      const status = materials.validate(fromJS({ materials: ['asdas'] })).toJS();
      expect(status.valid).to.be.true;
    });

    it('should validate materials length', () => {
      materials.__Rewire__('BULK_EDIT_VALIDATIONS', {MATERIALS_MAX_LENGTH: 2});
      expect(materials.validate(fromJS({ materials: ['asdas'] })).toJS().valid).to.be.true;
      expect(materials.validate(fromJS({ materials: [] })).toJS().valid).to.be.true;
      expect(materials.validate(fromJS({ materials: ['asdas', 'sas'] })).toJS().valid).to.be.true;
      expect(materials.validate(fromJS({ materials: ['asdas', 'wewe', 'qwee'] })).toJS().valid).to.be.false;
    });

    it('should pass error message', () => {
      materials.__Rewire__('BULK_EDIT_VALIDATIONS', {MATERIALS_MAX_LENGTH: 5});
      const status = materials.validate(fromJS({ materials: [''] })).toJS();
      expect(status.data).to.eql('Material cannot be empty string');
    });

    it('should compose remaining materials message', () => {
      materials.__Rewire__('BULK_EDIT_VALIDATIONS', {MATERIALS_MAX_LENGTH: 5});
      const status = materials.validate(fromJS({ materials: ['asdas'] })).toJS();
      expect(status.data).to.eql('4 remaining');
    });
  });
});
