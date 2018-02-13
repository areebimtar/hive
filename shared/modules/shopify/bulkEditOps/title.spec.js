import _ from 'lodash';
import { fromJS } from 'immutable';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as title from './title';

describe('Shopify BulkEditOps - Title', () => {
  let getFormattedTitleMessage;
  let getFormattedInvalidTitleMessage;

  beforeEach(() => {
    getFormattedTitleMessage = sinon.stub();
    getFormattedInvalidTitleMessage = sinon.stub();
    title.__Rewire__('getFormattedTitleMessage', getFormattedTitleMessage);
    title.__Rewire__('getFormattedInvalidTitleMessage', getFormattedInvalidTitleMessage);
  });

  describe('apply', () => {
    describe('add before op', () => {
      it('should not change original product', () => {
        const product = fromJS({ title: 'test' });
        title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, fromJS({value: 'PREPENDED'}));

        expect(product.toJS()).to.eql({ title: 'test' });
      });

      it('should prepend text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, 'PREPENDED');

        expect(result.toJS().title).to.eql('PREPENDEDtest');
      });

      it('should not prepend bad value input', () => {
        const product = fromJS({ title: 'test' });
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, '').toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, null).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, fromJS({w: 'ee'})).toJS().title).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, 'PREPENDED');

        expect(result.toJS()._formattedTitle).to.eql('<span class="add">PREPENDED</span>test');
      });

      it('should not format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, 'PREPENDED', true);

        expect(result.toJS()._formattedTitle).to.be.undefined;
      });

      it('should format and escape text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, '<PREPENDED>');
        expect(result.toJS()._formattedTitle).to.eql('<span class="add">&lt;PREPENDED&gt;</span>test');
      });

      it('should not fail if title is missing', () => {
        expect(title.apply(fromJS({}), BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, 'test').toJS().title).to.eql('test');
      });
    });

    describe('add after op', () => {
      it('should not change original product', () => {
        const product = fromJS({ title: 'test' });
        title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, fromJS({value: 'APPENDED'}));

        expect(product.toJS()).to.eql({ title: 'test' });
      });

      it('should append text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, 'APPENDED');

        expect(result.toJS().title).to.eql('testAPPENDED');
      });

      it('should not append bad value input', () => {
        const product = fromJS({ title: 'test' });
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, '').toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, null).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, fromJS({w: 'ee'})).toJS().title).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, 'APPENDED');

        expect(result.toJS()._formattedTitle).to.eql('test<span class="add">APPENDED</span>');
      });

      it('should not format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, 'APPENDED', true);

        expect(result.toJS()._formattedTitle).to.be.undefined;
      });

      it('should format and escape text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, '<APPENDED>');
        expect(result.toJS()._formattedTitle).to.eql('test<span class="add">&lt;APPENDED&gt;</span>');
      });

      it('should not fail if title is missing', () => {
        expect(title.apply(fromJS({}), BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, 'test').toJS().title).to.eql('test');
      });
    });

    describe('find and replace op', () => {
      it('should not change original product', () => {
        const product = fromJS({ title: 'test' });
        title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(product.toJS()).to.eql({ title: 'test' });
      });

      it('should find and replace text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.toJS().title).to.eql('AAst');
      });

      it('should find and replace mupliple text', () => {
        const product = fromJS({ title: 'test test tetest' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.toJS().title).to.eql('AAst AAst AAAAst');
      });

      it('should find and replace text case insensitive', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'TE', replace: 'AA'}));

        expect(result.toJS().title).to.eql('AAst');
      });

      it('should not find and replace text if input is bad', () => {
        const product = fromJS({ title: 'test' });
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: '', replace: 'AA'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: null, replace: 'AA'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: undefined, replace: 'AA'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: [], replace: 'AA'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 11, replace: 'AA'})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: ''})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: null})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 123})).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: []})).toJS().title).to.eql('test');
      });

      it('should format text - find', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te'}));

        expect(result.toJS()._formattedTitle).to.eql('<span class="replace">te</span>st');
      });

      it('should format and escape text - find', () => {
        const product = fromJS({ title: '<te>st' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: '<te>'}));

        expect(result.toJS()._formattedTitle).to.eql('<span class="replace">&lt;te&gt;</span>st');
      });

      it('should format text - find and replace', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.toJS()._formattedTitle).to.eql('<span class="add">AA</span>st');
      });

      it('should format and escape text - find and replace', () => {
        const product = fromJS({ title: '<te>st' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: '<te>', replace: '<AA>'}));

        expect(result.toJS()._formattedTitle).to.eql('<span class="add">&lt;AA&gt;</span>st');
      });

      it('should not fail if title is missing', () => {
        expect(title.apply(fromJS({}), BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'})).toJS().title).to.eql('');
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ title: 'test' });
        title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, fromJS({value: 'te'}));

        expect(product.toJS()).to.eql({ title: 'test' });
      });

      it('should delete text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'te');

        expect(result.toJS().title).to.eql('st');
      });

      it('should delete text multiple times', () => {
        const product = fromJS({ title: 'test test testtest' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'te');

        expect(result.toJS().title).to.eql('st st stst');
      });

      it('should delete text and be case insensitive', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'TE');

        expect(result.toJS().title).to.eql('st');
      });

      it('should not delete bad value input', () => {
        const product = fromJS({ title: 'test' });
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, '').toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, null).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, []).toJS().title).to.eql('test');
        expect(title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, fromJS({w: 'ee'})).toJS().title).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'te');

        expect(result.toJS()._formattedTitle).to.eql('<span class="del">te</span>st');
      });

      it('should format and escape text', () => {
        const product = fromJS({ title: '<te>st' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, '<te>');

        expect(result.toJS()._formattedTitle).to.eql('<span class="del">&lt;te&gt;</span>st');
      });

      it('should format text and preserve case', () => {
        const product = fromJS({ title: 'Test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'te');

        expect(result.toJS()._formattedTitle).to.eql('<span class="del">Te</span>st');
      });

      it('should format, escape text and preserve case', () => {
        const product = fromJS({ title: '<Te>st' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, '<te>');

        expect(result.toJS()._formattedTitle).to.eql('<span class="del">&lt;Te&gt;</span>st');
      });

      it('should not format text', () => {
        const product = fromJS({ title: 'test' });
        const result = title.apply(product, BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'te', true);

        expect(result.toJS()._formattedTitle).to.be.undefined;
      });

      it('should not fail if title is missing', () => {
        expect(title.apply(fromJS({}), BULK_EDIT_OP_CONSTS.TITLE_DELETE, 'test').toJS().title).to.eql('');
      });
    });
  });

  describe('validate', () => {
    it('should throw error on bad input', () => {
      const inputs = [null, undefined, {}, 0, 123, '', 'qweq'];
      let errs = 0;
      _.each(inputs, input => {
        try {
          title.validate(input);
        } catch (error) {
          errs++;
        }
      });

      expect(errs).to.eql(inputs.length);
      expect(getFormattedTitleMessage).not.to.have.been.called;
    });

    it('should validate title (0 left)', () => {
      title.__Rewire__('BULK_EDIT_VALIDATIONS', {TITLE_MAX_LENGTH: 5});
      const status = title.validate(fromJS({ title: 'asdas' })).toJS();

      expect(status.valid).to.be.true;
      expect(getFormattedTitleMessage).have.been.calledWithExactly(0);
    });

    it('should validate title (2 left)', () => {
      title.__Rewire__('BULK_EDIT_VALIDATIONS', {TITLE_MAX_LENGTH: 5});
      const status = title.validate(fromJS({ title: 'asd' })).toJS();

      expect(status.valid).to.be.true;
      expect(getFormattedTitleMessage).have.been.calledWithExactly(2);
    });

    it('should validate title (2 over)', () => {
      title.__Rewire__('BULK_EDIT_VALIDATIONS', {TITLE_MAX_LENGTH: 5});
      const status = title.validate(fromJS({ title: 'asdfghj' })).toJS();

      expect(status.valid).to.be.false;
      expect(getFormattedInvalidTitleMessage).have.been.calledWithExactly(2);
    });

    it('should validate empty title (set required)', () => {
      title.__Rewire__('BULK_EDIT_VALIDATIONS', {TITLE_MAX_LENGTH: 5});
      const status = title.validate(fromJS({ title: '' })).toJS();

      expect(getFormattedInvalidTitleMessage).not.have.been.called;
      expect(status.valid).to.be.false;
      expect(status.message).to.be.string;
    });
  });
});
