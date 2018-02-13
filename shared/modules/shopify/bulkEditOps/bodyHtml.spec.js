import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon'; // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as bodyHtml from './bodyHtml';

describe('BulkEditOps - bodyHtml', () => {
  describe('apply', () => {
    describe('add before op', () => {
      it('should not change original product', () => {
        const product = fromJS({ body_html: 'test' });
        bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, fromJS({value: 'PREPENDED'}));

        expect(product.toJS()).to.eql({ body_html: 'test' });
      });

      it('should prepend text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, 'PREPENDED');

        expect(result.get('body_html')).to.eql('PREPENDEDtest');
      });

      it('should not prepend bad value input', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, '').get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, null).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, {w: 'ee'}).get('body_html')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, 'PREPENDED');
        expect(result.getIn(['_formattedBodyHtml', 'value'])).to.eql('<span class="add before">PREPENDED</span>test');
      });

      it('should not format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, 'PREPENDED', true);

        expect(result.get('_formattedBodyHtml')).to.be.undefined;
      });

      it('should not fail if bodyHtml is undefined', () => {
        expect(bodyHtml.apply(fromJS({}), BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, 'test').get('body_html')).to.eql('test');
      });
    });

    describe('add after op', () => {
      it('should not change original product', () => {
        const product = fromJS({ body_html: 'test' });
        bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, fromJS({value: 'APPENDED'}));

        expect(product.toJS()).to.eql({ body_html: 'test' });
      });

      it('should append text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, 'APPENDED');

        expect(result.get('body_html')).to.eql('testAPPENDED');
      });

      it('should not append bad value input', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, '').get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, null).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, {w: 'ee'}).get('body_html')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, 'APPENDED');

        expect(result.getIn(['_formattedBodyHtml', 'value'])).to.eql('test<span class="add after">APPENDED</span>');
      });

      it('should not format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, 'APPENDED', true);

        expect(result.get('_formattedBodyHtml')).to.be.undefined;
      });

      it('should not fail if bodyHtml is undefined', () => {
        expect(bodyHtml.apply(fromJS({}), BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, 'test').get('body_html')).to.eql('test');
      });
    });

    describe('find and replace op', () => {
      it('should not change original product', () => {
        const product = fromJS({ body_html: 'test' });
        bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(product.toJS()).to.eql({ body_html: 'test' });
      });

      it('should find and replace text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.get('body_html')).to.eql('AAst');
      });

      it('should find and replace mupliple text', () => {
        const product = fromJS({ body_html: 'test test tetest' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.get('body_html')).to.eql('AAst AAst AAAAst');
      });

      it('should work with replace text containing dolars', () => {
        const product = fromJS({ body_html: 'test test tetest' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: '5$'}));

        expect(result.get('body_html')).to.eql('5$st 5$st 5$5$st');
      });

      it('should find and replace text case insensitive', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'TE', replace: 'AA'}));

        expect(result.get('body_html')).to.eql('AAst');
      });

      it('should not find and replace text if input is bad', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: '', replace: 'AA'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: null, replace: 'AA'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: undefined, replace: 'AA'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: [], replace: 'AA'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 11, replace: 'AA'})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: ''})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: null})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: 123})).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: []})).get('body_html')).to.eql('test');
      });

      it('should not fail if bodyHtml is undefined', () => {
        expect(bodyHtml.apply(fromJS({}), BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'BB', replace: 'AA'})).get('body_html')).to.eql('');
      });

      it('should format text - find', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te'}));

        expect(result.toJS()._formattedBodyHtml.value).to.eql('<span class="replace">te</span>st');
      });

      it('should format text - find and replace', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'te', replace: 'AA'}));

        expect(result.toJS()._formattedBodyHtml.value).to.eql('<span class="add">AA</span>st');
      });

      it('should format text and count occurences - find', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test'}));

        expect(result.getIn(['_formattedBodyHtml', 'count'])).to.eql(10);
      });

      it('should format text and count occurences - find and replace', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}));

        expect(result.getIn(['_formattedBodyHtml', 'count'])).to.eql(10);
      });

      it('should format text and set count message - find', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test'}));

        expect(result.getIn(['_formattedBodyHtml', 'countMsg'])).to.eql('10 instances found');
      });

      it('should format text and set count message - find and replace', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}));

        expect(result.getIn(['_formattedBodyHtml', 'countMsg'])).to.eql('10 instances found');
      });

      it('should not format text - find', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test'}), true);

        expect(result.toJS()._formattedBodyHtml).to.be.undefined;
      });

      it('should format text correctly if replacement contains dollar', () => {
        const product = fromJS({ body_html: 'test value'});
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test', replace: '5$'}));

        const formattedbodyHtml = result.getIn(['_formattedBodyHtml']).toJS();
        expect(formattedbodyHtml.countMsg).to.eql('1 instance found');
        expect(formattedbodyHtml.value).to.be.eql('<span class="add">5$</span> value');
      });

      it('should not format text - find and replace', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, fromJS({find: 'test', replace: '<AA>'}), true);

        expect(result.toJS()._formattedBodyHtml).to.be.undefined;
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ body_html: 'test' });
        bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, fromJS({value: 'te'}));

        expect(product.toJS()).to.eql({ body_html: 'test' });
      });

      it('should delete text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'te');

        expect(result.get('body_html')).to.eql('st');
      });

      it('should delete text multiple times', () => {
        const product = fromJS({ body_html: 'test test testtest' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'te');

        expect(result.get('body_html')).to.eql('st st stst');
      });

      it('should delete text and be case insensitive', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'TE');

        expect(result.get('body_html')).to.eql('st');
      });

      it('should not delete bad value input', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, '').get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, null).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, []).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, {w: 'ee'}).get('body_html')).to.eql('test');
      });

      it('should format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'te');

        expect(result.getIn(['_formattedBodyHtml', 'value'])).to.eql('<span class="del">te</span>st');
      });

      it('should format text and preserve case', () => {
        const product = fromJS({ body_html: 'Test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'te');

        expect(result.getIn(['_formattedBodyHtml', 'value'])).to.eql('<span class="del">Te</span>st');
      });

      it('should format text and count occurences', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'st');

        expect(result.getIn(['_formattedBodyHtml', 'count'])).to.eql(10);
      });

      it('should format text and set count message', () => {
        const product = fromJS({ body_html: 'test1\ntest2\ntest3\ntest4\ntest5\ntest6\ntest7\ntest8\ntest9\ntest10' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'st');

        expect(result.getIn(['_formattedBodyHtml', 'countMsg'])).to.eql('10 instances found');
      });

      it('should not format text', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'te', true);

        expect(result.get('_formattedBodyHtml')).to.be.undefined;
      });

      it('should not fail if bodyHtml is undefined', () => {
        expect(bodyHtml.apply(fromJS({}), BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, 'test').get('body_html')).to.eql('test');
      });

      it('should remove empty HTML tags', () => {
        const product = fromJS({ body_html: '<ol><li><strong><em><u>foo</u></em></strong></li><li>bar</li></ol>' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, 'foo').get('body_html')).to.eql('<ol><li>bar</li></ol>');
      });
    });

    describe('set op', () => {
      it('should not change original product', () => {
        const product = fromJS({ body_html: 'test' });
        bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET, fromJS({value: 'new bodyHtml'}));

        expect(product.toJS()).to.eql({ body_html: 'test' });
      });

      it('should set new bodyHtml', () => {
        const product = fromJS({ body_html: 'test' });
        const result = bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET, 'new bodyHtml');

        expect(result.get('body_html')).to.eql('new bodyHtml');
      });

      it('should clear bodyHtml', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET, '').get('body_html')).to.eql('');
      });

      it('should not set bad value input', () => {
        const product = fromJS({ body_html: 'test' });
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET, null).get('body_html')).to.eql('test');
        expect(bodyHtml.apply(product, BULK_EDIT_OP_CONSTS.BODY_HTML_SET, {w: 'ee'}).get('body_html')).to.eql('test');
      });
    });
  });
});
