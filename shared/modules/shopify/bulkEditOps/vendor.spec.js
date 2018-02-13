import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import * as vendor from './vendor';

describe('Shopify BulkEditOps - Vendor', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, 'new test type');

        expect(product.toJS()).to.eql({ [FIELDS.VENDOR]: 'test type' });
      });

      it('should set new vendor', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        const result = vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, 'new test type');

        expect(result.toJS()[FIELDS.VENDOR]).to.eql('new test type');
      });

      it('should clear vendor', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        const result = vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, 'None');

        expect(result.toJS()[FIELDS.VENDOR]).to.eql('');
      });

      it('should not set vendor on bad value input', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        expect(vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET).toJS()[FIELDS.VENDOR]).to.eql('test type');
        expect(vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, null).toJS()[FIELDS.VENDOR]).to.eql('test type');
        expect(vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, fromJS({w: 'ee'})).toJS()[FIELDS.VENDOR]).to.eql('test type');
      });

      it('should format vendor', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        const result = vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, 'new test type');

        expect(result.toJS()._formattedVendor).to.eql({ new: 'new test type', old: 'test type' });
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.VENDOR]: 'test type' });
        const result = vendor.apply(product, BULK_EDIT_OP_CONSTS.VENDOR_SET, 'new test type', true);

        expect(result.toJS()._formattedVendor).to.be.undefined;
      });
    });
  });
});
