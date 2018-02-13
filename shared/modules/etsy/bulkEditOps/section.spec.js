import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import * as section from './section';

describe('BulkEditOps - Section', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, '2345');

        expect(product.toJS()).to.eql({ [FIELDS.SECTION_ID]: '1234' });
      });

      it('should set new section', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        const result = section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, '2345');

        expect(result.toJS()[FIELDS.SECTION_ID]).to.eql('2345');
      });

      it('should clear section', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        const result = section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, 'none');

        expect(result.toJS()[FIELDS.SECTION_ID]).to.eql('');
      });

      it('should not set section on bad value input', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        expect(section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET).toJS()[FIELDS.SECTION_ID]).to.eql('1234');
        expect(section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, null).toJS()[FIELDS.SECTION_ID]).to.eql('1234');
        expect(section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, fromJS({w: 'ee'})).toJS()[FIELDS.SECTION_ID]).to.eql('1234');
      });

      it('should format section', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        const result = section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, '2345');

        expect(result.toJS()._formattedShopSectionId).to.eql({ new: '2345', old: '1234' });
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.SECTION_ID]: '1234' });
        const result = section.apply(product, BULK_EDIT_OP_CONSTS.SECTION_SET, '2345', true);

        expect(result.toJS()._formattedShopSectionId).to.be.undefined;
      });
    });
  });

  describe('validate', () => {
    it('should be always valid', () => {
      const inputs = [null, undefined, fromJS({}), 0, 123, '', 'qweq'];
      _.each(inputs, input => {
        expect(section.validate(input).toJS().valid).to.be.true;
      });
    });
  });
});
