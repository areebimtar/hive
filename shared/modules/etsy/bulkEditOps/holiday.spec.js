import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as holiday from './holiday';

describe('BulkEditOps - Holiday', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should add holiday', () => {
        const attributes = [];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, 123);

        expect(result.toJS().attributes).to.eql([{ propertyId: '46803063659', valueIds: [123] }]);
      });

      it('should not add holiday', () => {
        const attributes = [];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, -1);

        expect(result.toJS().attributes).to.eql([]);
      });

      it('should update holiday', () => {
        const attributes = [{ propertyId: '46803063659', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, 123);

        expect(result.toJS().attributes).to.eql([{ propertyId: '46803063659', scaleIds: [], valueIds: [123] }]);
      });

      it('should delete holiday', () => {
        const attributes = [{ propertyId: '46803063659', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, -1);

        expect(result.toJS().attributes).to.eql([]);
      });

      it('should format holiday', () => {
        const attributes = [{ propertyId: '46803063659', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, 123);

        expect(result.toJS()._formattedHoliday).to.eql({ new: 123, old: 42 });
      });

      it('should not format text', () => {
        const attributes = [{ propertyId: '46803063659', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, 123, true);

        expect(result.toJS()._formattedHoliday).to.be.undefined;
      });

      it('should not modify other attributes on delete', () => {
        const attributes = [{ propertyId: '123', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: true, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, -1);

        expect(result.toJS().attributes).to.eql([{ propertyId: '123', scaleIds: [], valueIds: [42] }]);
      });

      it('should not set occasion if can_write_inventory is set to false', () => {
        const attributes = [{ propertyId: '46803063641', scaleIds: [], valueIds: [42] }];
        const product = fromJS({ can_write_inventory: false, attributes });
        const result = holiday.apply(product, BULK_EDIT_OP_CONSTS.HOLIDAY_SET, 123, true);

        expect(result).to.eql(product);
      });
    });
  });
});
