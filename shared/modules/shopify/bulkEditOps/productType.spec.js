import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import * as productType from './productType';

describe('Shopify BulkEditOps - Product Type', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, 'new test type');

        expect(product.toJS()).to.eql({ [FIELDS.PRODUCT_TYPE]: 'test type' });
      });

      it('should set new product type', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        const result = productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, 'new test type');

        expect(result.toJS()[FIELDS.PRODUCT_TYPE]).to.eql('new test type');
      });

      it('should clear product type', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        const result = productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, 'None');

        expect(result.toJS()[FIELDS.PRODUCT_TYPE]).to.eql('');
      });

      it('should not set product type on bad value input', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        expect(productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET).toJS()[FIELDS.PRODUCT_TYPE]).to.eql('test type');
        expect(productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, null).toJS()[FIELDS.PRODUCT_TYPE]).to.eql('test type');
        expect(productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, fromJS({w: 'ee'})).toJS()[FIELDS.PRODUCT_TYPE]).to.eql('test type');
      });

      it('should format product type', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        const result = productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, 'new test type');

        expect(result.toJS()._formattedProductType).to.eql({ new: 'new test type', old: 'test type' });
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.PRODUCT_TYPE]: 'test type' });
        const result = productType.apply(product, BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET, 'new test type', true);

        expect(result.toJS()._formattedProductType).to.be.undefined;
      });
    });
  });
});
