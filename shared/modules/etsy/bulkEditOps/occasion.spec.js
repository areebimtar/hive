import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as occasion from './occasion';

describe('BulkEditOps - Occasion', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should add occasion', () => {
        const attributes = [];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, 123);

        expect(result.toJS().attributes).to.eql([{ propertyId: '46803063641', valueIds: [123] }]);
      });

      it('should not add occasion', () => {
        const attributes = [];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, -1);

        expect(result.toJS().attributes).to.eql([]);
      });

      it('should update occasion', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, 123);

        expect(result.toJS().attributes).to.eql([{ propertyId: '46803063641', scaleIds: [], valueIds: [123] }]);
      });

      it('should delete occasion', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, -1);

        expect(result.toJS().attributes).to.eql([]);
      });

      it('should format occasion', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, 123);

        expect(result.toJS()._formattedOccasion).to.eql({ new: 123, old: 42 });
      });

      it('should not format text', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, 123, true);

        expect(result.toJS()._formattedOccasion).to.be.undefined;
      });

      it('should not modify other attributes on delete', () => {
        const attributes = [{ propertyId: '123', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, -1);

        expect(result.toJS().attributes).to.eql([{ propertyId: '123', scaleIds: [], valueIds: [42] }]);
      });

      it('should not set occasion if can_write_inventory is set to false', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: false, attributes });
        const result = occasion.apply(product, BULK_EDIT_OP_CONSTS.OCCASION_SET, 123, true);

        expect(result).to.eql(product);
      });
    });
  });

  describe('updatedOccasionAttributeForTaxonomy', () => {
    let getAttribute;

    beforeEach(() => {
      getAttribute = sinon.stub();
      occasion.__Rewire__('getAttribute', getAttribute);
    });

    afterEach(() => {
      occasion.__ResetDependency__('getAttribute');
    });

    it('should not modify product if there are no options and product dosnt have occasion attribute', () => {
      getAttribute.returns(fromJS({ availableOptions: [] }));
      const attributes = [{ propertyId: '123', valueIds: [1] }];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123);

      expect(result).to.eql(product);
    });

    it('should remove attribute from product if there are no options and product have occasion attribute', () => {
      getAttribute.returns(fromJS({ availableOptions: [] }));
      const attributes = [{ propertyId: '46803063641', valueIds: [1] }];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123).toJS();

      expect(result.attributes).to.eql([]);
    });

    it('should set attribute if there is only one option and product have occasion attribute', () => {
      const option = { id: 111 };
      getAttribute.returns(fromJS({ availableOptions: [option] }));
      const attributes = [{ propertyId: '46803063641', valueIds: [1] }];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123).toJS();

      expect(result.attributes).to.eql([{ propertyId: '46803063641', valueIds: [111] }]);
    });

    it('should insert new attribute if there is only one option and product doesnt have occasion attribute', () => {
      const option = { id: 111 };
      getAttribute.returns(fromJS({ availableOptions: [option] }));
      const attributes = [];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123).toJS();

      expect(result.attributes).to.eql([{ propertyId: '46803063641', valueIds: [111] }]);
    });

    it('should not modify attribute if there are multiple options and product have valid occasion attribute', () => {
      getAttribute.returns(fromJS({ availableOptions: [{ id: 123 }, { id: 234 }, { id: 345 }] }));
      const attributes = [{ propertyId: '46803063641', valueIds: [234] }];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123).toJS();

      expect(result.attributes).to.eql([{ propertyId: '46803063641', valueIds: [234] }]);
    });

    it('should use first option as new attribute value if there are multiple options and product have invalid occasion attribute', () => {
      getAttribute.returns(fromJS({ availableOptions: [{ id: 123 }, { id: 234 }, { id: 345 }] }));
      const attributes = [{ propertyId: '46803063641', valueIds: [1] }];
      const product = fromJS({ can_write_inventory: true, attributes });

      const result = occasion.updatedOccasionAttributeForTaxonomy(product, 123).toJS();

      expect(result.attributes).to.eql([{ propertyId: '46803063641', valueIds: [123] }]);
    });
  });
});
