import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon'; // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as description from './description';

describe('BulkEditOps - Description', () => {
  describe('apply', () => {
    describe('add before op', () => {
      it('should not change original product', () => {
        const product = fromJS({ description: 'test' });
        description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, fromJS({value: 'PREPENDED'}));

        expect(product.toJS()).to.eql({ description: 'test' });
      });

      it('should prepend text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED');

        expect(result.get('description')).to.eql('PREPENDEDtest');
      });

      it('should not prepend bad value input', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, '').get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, null).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, {w: 'ee'}).get('description')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add before">PREPENDED</span>test');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="add before">PREPENDED</span>test');
      });

      it('should format text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add before">PREPENDED</span>test1\ntest2\ntest3\ntest4\ntest5\ntest6');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="add before">PREPENDED</span>test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should not format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED', true);

        expect(result.get('_formattedDescription')).to.be.undefined;
      });

      it('should format and escape text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, '<PREPENDED>');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add before">&lt;PREPENDED&gt;</span>test');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="add before">&lt;PREPENDED&gt;</span>test');
      });

      it('should format and escape text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, '<PREPENDED>');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add before">&lt;PREPENDED&gt;</span>test1\ntest2\ntest3\ntest4\ntest5\ntest6');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="add before">&lt;PREPENDED&gt;</span>test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should set correct line count', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED\nPREPENDED');
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(15);
      });

      it('should set line count to 6', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'PREPENDED');
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(6);
      });

      it('should not fail if description is undefined', () => {
        expect(description.apply(fromJS({}), BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE, 'test').get('description')).to.eql('test');
      });
    });

    describe('add after op', () => {
      it('should not change original product', () => {
        const product = fromJS({ description: 'test' });
        description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, fromJS({value: 'APPENDED'}));

        expect(product.toJS()).to.eql({ description: 'test' });
      });

      it('should append text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED');

        expect(result.get('description')).to.eql('testAPPENDED');
      });

      it('should not append bad value input', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, '').get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, null).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, {w: 'ee'}).get('description')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('test<span class="add after">APPENDED</span>');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test<span class="add after">APPENDED</span>');
      });

      it('should format text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('test5\ntest6\ntest7\ntest8\ntest9\ntest10<span class="add after">APPENDED</span>');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10<span class="add after">APPENDED</span>');
      });

      it('should not format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED', true);

        expect(result.get('_formattedDescription')).to.be.undefined;
      });

      it('should format and escape text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, '<APPENDED>');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('test<span class="add after">&lt;APPENDED&gt;</span>');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test<span class="add after">&lt;APPENDED&gt;</span>');
      });

      it('should format and escape text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, '<APPENDED>');
        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('test5\ntest6\ntest7\ntest8\ntest9\ntest10<span class="add after">&lt;APPENDED&gt;</span>');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10<span class="add after">&lt;APPENDED&gt;</span>');
      });

      it('should set correct line count', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED\nAPPENDED');
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(15);
      });

      it('should set line count to 6', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED');
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(6);
      });

      it('should not count empty line into the count', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'APPENDED\ntest\n');
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(7);
      });

      it('should not fail if description is undefined', () => {
        expect(description.apply(fromJS({}), BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'test').get('description')).to.eql('test');
      });
    });

    describe('find and replace op', () => {
      it('should not change original product', () => {
        const product = fromJS({ description: 'test' });
        description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(product.toJS()).to.eql({ description: 'test' });
      });

      it('should find and replace text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.get('description')).to.eql('AAst');
      });

      it('should find and replace mupliple text', () => {
        const product = fromJS({ description: 'test test tetest' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.get('description')).to.eql('AAst AAst AAAAst');
      });

      it('should work with replace text containing dolars', () => {
        const product = fromJS({ description: 'test test tetest' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: '5$'}));

        expect(result.get('description')).to.eql('5$st 5$st 5$5$st');
      });

      it('should find and replace text case insensitive', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'TE', replace: 'AA'}));

        expect(result.get('description')).to.eql('AAst');
      });

      it('should find and replace text even when line endings are different', ()=>{
        const textWithCRLFendings = 'A First\u000D\u000A\u000D\u000ASecond B';
        const value = fromJS({find: 'First\u000A\u000ASecond', replace: '--'});
        const expectedOutput = 'A -- B';
        const product = fromJS({ description: textWithCRLFendings });

        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, value);

        expect(result.get('description')).to.eql(expectedOutput);
      });

      it('should not find and replace text if input is bad', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: '', replace: 'AA'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: null, replace: 'AA'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: undefined, replace: 'AA'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: [], replace: 'AA'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 11, replace: 'AA'})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: ''})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: null})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: 123})).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: []})).get('description')).to.eql('test');
      });

      it('should not fail if description is undefined', () => {
        expect(description.apply(fromJS({}), BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'BB', replace: 'AA'})).get('description')).to.eql('');
      });

      it('should format text - find', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te'}));

        expect(result.toJS()._formattedDescription.value).to.eql('<span class="replace">te</span>st');
        expect(result.toJS()._formattedDescription.fullValue).to.eql('<span class="replace">te</span>st');
      });

      it('should format text - find - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test3'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="replace">test3</span>\ntest4\ntest5\ntest6\ntest7\ntest8');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\n<span class="replace">test3</span>\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format and escape text - find', () => {
        const product = fromJS({ description: '<te>st' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: '<te>'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="replace">&lt;te&gt;</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="replace">&lt;te&gt;</span>st');
      });

      it('should format and escape text - find - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\nt<es>t4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 't<es>t'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="replace">t&lt;es&gt;t</span>4\ntest5\ntest6\ntest7\ntest8\ntest9');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\n<span class="replace">t&lt;es&gt;t</span>4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format text - find and replace', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.toJS()._formattedDescription.value).to.eql('<span class="add">AA</span>st');
        expect(result.toJS()._formattedDescription.fullValue).to.eql('<span class="add">AA</span>st');
      });

      it('should format text - find and replace - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'st6', replace: 'AA'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('te<span class="add">AA</span>\ntest7\ntest8\ntest9\ntest10');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\ntest4\ntest5\nte<span class="add">AA</span>\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format and escape text - find and replace', () => {
        const product = fromJS({ description: '<te>st' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: '<te>', replace: '<AA>'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add">&lt;AA&gt;</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="add">&lt;AA&gt;</span>st');
      });

      it('should format and escape text - find and replace - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\nt<est>5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 't<est>', replace: '<AA>'}));

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="add">&lt;AA&gt;</span>5\ntest6\ntest7\ntest8\ntest9\ntest10');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\ntest4\n<span class="add">&lt;AA&gt;</span>5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format text and count occurences - find', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test'}));

        expect(result.getIn(['_formattedDescription', 'count'])).to.eql(10);
      });

      it('should format text and count occurences - find with different line endings', () => {
        const product = fromJS({ description: 'test\u000D\u000Atest1\u000D\u000Atest\u000D\u000Atest1' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test\u000Ate'}));

        expect(result.getIn(['_formattedDescription', 'count'])).to.eql(2);
      });

      it('should format text and count occurences - find and replace', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}));

        expect(result.getIn(['_formattedDescription', 'count'])).to.eql(10);
      });

      it('should format text and set count message - find', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test'}));

        expect(result.getIn(['_formattedDescription', 'countMsg'])).to.eql('10 instances found');
      });

      it('should format text and set count message - find and replace', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}));

        expect(result.getIn(['_formattedDescription', 'countMsg'])).to.eql('10 instances found');
      });

      it('should not format text - find', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test'}), true);

        expect(result.toJS()._formattedDescription).to.be.undefined;
      });

      it('should format text correctly if replacement contains dollar', () => {
        const product = fromJS({ description: 'test value'});
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test', replace: '5$'}));

        const formattedDescription = result.getIn(['_formattedDescription']).toJS();
        expect(formattedDescription.countMsg).to.eql('1 instance found');
        expect(formattedDescription.lineCount).to.be.eql(6);
        expect(formattedDescription.value).to.be.eql('<span class="add">5$</span> value');
        expect(formattedDescription.fullValue).to.be.eql('<span class="add">5$</span> value');
      });

      it('should not format text - find and replace', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}), true);

        expect(result.toJS()._formattedDescription).to.be.undefined;
      });

      it('should set line count to 6', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}));
        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(6);
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ description: 'test' });
        description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, fromJS({value: 'te'}));

        expect(product.toJS()).to.eql({ description: 'test' });
      });

      it('should delete text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te');

        expect(result.get('description')).to.eql('st');
      });

      it('should delete text multiple times', () => {
        const product = fromJS({ description: 'test test testtest' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te');

        expect(result.get('description')).to.eql('st st stst');
      });

      it('should delete text and be case insensitive', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'TE');

        expect(result.get('description')).to.eql('st');
      });

      it('should delete text even when line endings are different', () => {
        const textWithCRLFendings = 'A First\u000D\u000A\u000D\u000ASecond B';
        const deleteTextWithLFendings = 'First\u000A\u000ASecond';
        const expectedOutput = 'A  B';

        const product = fromJS({ description: textWithCRLFendings });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, deleteTextWithLFendings);

        expect(result.get('description')).to.eql(expectedOutput);
      });

      it('should not delete bad value input', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, '').get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, null).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, []).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, {w: 'ee'}).get('description')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="del">te</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="del">te</span>st');
      });

      it('should format text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'test');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="del">test</span>1\n<span class="del">test</span>2\n<span class="del">test</span>3\n<span class="del">test</span>4\n<span class="del">test</span>5\n<span class="del">test</span>6');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="del">test</span>1\n<span class="del">test</span>2\n<span class="del">test</span>3\n<span class="del">test</span>4\n<span class="del">test</span>5\n<span class="del">test</span>6\n<span class="del">test</span>7\n<span class="del">test</span>8\n<span class="del">test</span>9\n<span class="del">test</span>10');
      });

      it('should format and escape text', () => {
        const product = fromJS({ description: '<te>st' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, '<te>');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="del">&lt;te&gt;</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="del">&lt;te&gt;</span>st');
      });

      it('should format and escape text - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\nt<es>t3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, '<es>');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('t<span class="del">&lt;es&gt;</span>t3\ntest4\ntest5\ntest6\ntest7\ntest8');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\nt<span class="del">&lt;es&gt;</span>t3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format text and preserve case', () => {
        const product = fromJS({ description: 'Test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="del">Te</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="del">Te</span>st');
      });

      it('should format text and preserve case - preview lines', () => {
        const product = fromJS({ description: 'test1\nteSt2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'st2');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('te<span class="del">St2</span>\ntest3\ntest4\ntest5\ntest6\ntest7');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\nte<span class="del">St2</span>\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format, escape text and preserve case', () => {
        const product = fromJS({ description: '<Te>st' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, '<te>');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('<span class="del">&lt;Te&gt;</span>st');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('<span class="del">&lt;Te&gt;</span>st');
      });

      it('should format, escape text and preserve case - preview lines', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\nte<ST>4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, '<st>4');

        expect(result.getIn(['_formattedDescription', 'value'])).to.eql('te<span class="del">&lt;ST&gt;4</span>\ntest5\ntest6\ntest7\ntest8\ntest9');
        expect(result.getIn(['_formattedDescription', 'fullValue'])).to.eql('test1\ntest2\ntest3\nte<span class="del">&lt;ST&gt;4</span>\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10');
      });

      it('should format text and count occurences', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'st');

        expect(result.getIn(['_formattedDescription', 'count'])).to.eql(10);
      });

      it('should format text and count occurences - even with different line endings', () => {
        const product = fromJS({ description: 'test\u000D\u000Atest1\u000D\u000Atest\u000D\u000Atest1' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'test\u000Ate');

        expect(result.getIn(['_formattedDescription', 'count'])).to.eql(2);
      });

      it('should format text and set count message', () => {
        const product = fromJS({ description: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'st');

        expect(result.getIn(['_formattedDescription', 'countMsg'])).to.eql('10 instances found');
      });

      it('should not format text', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te', true);

        expect(result.get('_formattedDescription')).to.be.undefined;
      });

      it('should set line count to 6', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE, 'te');

        expect(result.getIn(['_formattedDescription', 'lineCount'])).to.eql(6);
      });

      it('should not fail if description is undefined', () => {
        expect(description.apply(fromJS({}), BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER, 'test').get('description')).to.eql('test');
      });
    });

    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ description: 'test' });
        description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET, fromJS({value: 'new description'}));

        expect(product.toJS()).to.eql({ description: 'test' });
      });

      it('should set new description', () => {
        const product = fromJS({ description: 'test' });
        const result = description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET, 'new description');

        expect(result.get('description')).to.eql('new description');
      });

      it('should clear description', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET, '').get('description')).to.eql('');
      });

      it('should not set bad value input', () => {
        const product = fromJS({ description: 'test' });
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET, null).get('description')).to.eql('test');
        expect(description.apply(product, BULK_EDIT_OP_CONSTS.DESCRIPTION_SET, {w: 'ee'}).get('description')).to.eql('test');
      });
    });
  });
});
