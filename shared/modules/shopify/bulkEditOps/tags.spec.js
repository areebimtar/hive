import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as tags from './tags';

describe('BulkEditOps - Shopify - Tags', () => {
  describe('apply', () => {
    describe('add op', () => {
      it('should not change original product', () => {
        const product = fromJS({ tags: ['test'] });
        tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, fromJS({value: 'foo, bar, baz, boo'}));

        expect(product.toJS()).to.eql({ tags: ['test'] });
      });

      it('should add new tag', () => {
        const product = fromJS({ tags: ['test'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, 'foo');

        expect(result.toJS().tags).to.eql(['test', 'foo']);
      });

      it('should add multiple tags', () => {
        const product = fromJS({ tags: ['test'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, 'foo, bar, baz, boo');

        expect(result.toJS().tags).to.eql(['test', 'foo', 'bar', 'baz', 'boo']);
      });

      it('should not add tags on bad value input', () => {
        const product = fromJS({ tags: ['test'] });
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD).toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, '').toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, null).toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, fromJS({w: 'ee'})).toJS().tags).to.eql(['test']);
      });

      it('should format tags', () => {
        const product = fromJS({ tags: ['test'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, 'foo, bar');

        expect(result.toJS()._formattedTags).to.eql([{name: 'test', status: 'tag'}, {name: 'foo', status: 'add'}, {name: 'bar', status: 'add'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ tags: ['test'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_ADD, 'new tag', true);

        expect(result.toJS()._formattedTags).to.be.undefined;
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ tags: ['test'] });
        tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, fromJS({value: 'test'}));

        expect(product.toJS()).to.eql({ tags: ['test'] });
      });

      it('should delete tag', () => {
        const product = fromJS({ tags: ['test', 'foo'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'foo');

        expect(result.toJS().tags).to.eql(['test']);
      });

      it('should delete multiple tags sequentially', () => {
        const product = fromJS({ tags: ['test', 'foo', 'bar', 'booo'] });
        let result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'bar');
        result = tags.apply(result, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'booo');

        expect(result.toJS().tags).to.eql(['test', 'foo']);
      });

      it('should delete multiple tags', () => {
        const product = fromJS({ tags: ['test', 'foo', 'bar', 'baz', 'boo'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'foo,  , boo');

        expect(result.toJS().tags).to.eql(['test', 'bar', 'baz']);
      });

      it('should not delete tags on bad value input', () => {
        const product = fromJS({ tags: ['test'] });
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE).toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, '').toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, null).toJS().tags).to.eql(['test']);
        expect(tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, fromJS({w: 'ee'})).toJS().tags).to.eql(['test']);
      });

      it('should format tags', () => {
        const product = fromJS({ tags: ['test', 'foo'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'foo');

        expect(result.toJS()._formattedTags).to.eql([{name: 'test', status: 'tag'}, {name: 'foo', status: 'del'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ tags: ['test'] });
        const result = tags.apply(product, BULK_EDIT_OP_CONSTS.TAGS_DELETE, 'test', true);

        expect(result.toJS()._formattedTags).to.be.undefined;
      });
    });
  });

  describe('validate', () => {
    it('should throw error on bad input', () => {
      const inputs = [null, undefined, fromJS({}), 0, 123, '', 'qweq'];
      let errs = 0;
      _.each(inputs, input => {
        try {
          tags.validate(input);
        } catch (error) {
          errs++;
        }
      });

      expect(errs).to.eql(inputs.length);
    });

    it('should validate tags', () => {
      tags.__Rewire__('BULK_EDIT_VALIDATIONS', {TAGS_MAX_LENGTH: 5});
      const status = tags.validate(fromJS({ tags: ['asdas'] })).toJS();
      expect(status.valid).to.be.true;
    });

    it('should validate tags length', () => {
      tags.__Rewire__('BULK_EDIT_VALIDATIONS', {TAGS_MAX_LENGTH: 2});
      expect(tags.validate(fromJS({ tags: ['asdas'] })).toJS().valid).to.be.true;
      expect(tags.validate(fromJS({ tags: [] })).toJS().valid).to.be.true;
      expect(tags.validate(fromJS({ tags: ['asdas', 'sas'] })).toJS().valid).to.be.true;
      expect(tags.validate(fromJS({ tags: ['asdas', 'wewe', 'qwee'] })).toJS().valid).to.be.false;
    });

    it('should pass error message', () => {
      tags.__Rewire__('BULK_EDIT_VALIDATIONS', {TAGS_MAX_LENGTH: 5});
      const status = tags.validate(fromJS({ tags: [''] })).toJS();
      expect(status.data).to.eql('Tag cannot be empty string');
    });

    it('should compose remaining tags message', () => {
      tags.__Rewire__('BULK_EDIT_VALIDATIONS', {TAGS_MAX_LENGTH: 5});
      const status = tags.validate(fromJS({ tags: ['asdas'] })).toJS();
      expect(status.data).to.eql('4 remaining');
    });
  });
});
