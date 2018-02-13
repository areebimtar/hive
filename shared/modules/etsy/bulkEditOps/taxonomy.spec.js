import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as taxonomy from './taxonomy';

describe('BulkEditOps - Taxonomy', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ taxonomy_id: 'test' });
        taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, '123');

        expect(product.toJS()).to.eql({ taxonomy_id: 'test' });
      });

      it('should set new taxonomy', () => {
        const product = fromJS({ taxonomy_id: '123' });
        const result = taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, '234');

        expect(result.toJS().taxonomy_id).to.eql('234');
      });

      it('should not set taxonomy on bad value input', () => {
        const product = fromJS({ taxonomy_id: '123' });
        expect(taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET).toJS().taxonomy_id).to.eql('123');
        expect(taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, null).toJS().taxonomy_id).to.eql('123');
        expect(taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, '').toJS().taxonomy_id).to.eql('123');
        expect(taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, fromJS({w: 'ee'})).toJS().taxonomy_id).to.eql('123');
      });

      it('should format taxonomy', () => {
        const product = fromJS({ taxonomy_id: '123' });
        const result = taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, '234');

        expect(result.toJS()._formattedTaxonomyId).to.eql({ new: '234', old: '123' });
      });

      it('should not format text', () => {
        const product = fromJS({ taxonomy_id: '123' });
        const result = taxonomy.apply(product, BULK_EDIT_OP_CONSTS.TAXONOMY_SET, '234', true);

        expect(result.toJS()._formattedTaxonomyId).to.be.undefined;
      });
    });
  });
});
