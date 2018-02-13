import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as recipient from './recipient';

describe('BulkEditOps - Recipient', () => {
  describe('apply', () => {
    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ recipient: 'test' });
        recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, fromJS({value: 'foo'}));

        expect(product.toJS()).to.eql({ recipient: 'test' });
      });

      it('should set new recipient', () => {
        const product = fromJS({ recipient: 'test' });
        const result = recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, 'foo');

        expect(result.toJS().recipient).to.eql('foo');
      });

      it('should clear recipient', () => {
        const product = fromJS({ recipient: 'test' });
        const result = recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, 'none');

        expect(result.toJS().recipient).to.eql(undefined);
      });

      it('should not set recipient on bad value input', () => {
        const product = fromJS({ recipient: 'test' });
        expect(recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET).toJS().recipient).to.eql('test');
        expect(recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, null).toJS().recipient).to.eql('test');
        expect(recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, {w: 'ee'}).toJS().recipient).to.eql('test');
      });

      it('should format recipient', () => {
        const product = fromJS({ recipient: 'test' });
        const result = recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, 'foo');

        expect(result.toJS()._formattedRecipient).to.eql({ new: 'foo', old: 'test' });
      });

      it('should not format text', () => {
        const product = fromJS({ recipient: 'test' });
        const result = recipient.apply(product, BULK_EDIT_OP_CONSTS.RECIPIENT_SET, 'foo', true);

        expect(result.toJS()._formattedRecipient).to.be.undefined;
      });
    });
  });

  describe('validate', () => {
    it('should be always valid', () => {
      const inputs = [null, undefined, fromJS({}), 0, 123, '', 'qweq'];
      _.each(inputs, input => {
        expect(recipient.validate(input).toJS().valid).to.be.true;
      });
    });
  });
});
