import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

import { FIELDS } from '../constants';

chai.use(sinonChai);

import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as photos from './photos';

describe('BulkEditOps - Photos', () => {
  describe('apply', () => {
    describe('add op', () => {
      beforeEach(() => {
        photos.__Rewire__('BULK_EDIT_VALIDATIONS', { PHOTOS_MAX_LENGTH: 5 });
      });

      afterEach(() => {
        photos.__ResetDependency__('BULK_EDIT_VALIDATIONS');
      });

      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(product.toJS()).to.eql({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
      });

      it('should add new photo', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}, {thumbnail_url: '/test/url4'}]);
      });

      it('should add new photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url3'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url3'}]);
      });

      it('should not add more photos if limit is exceeded', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}, {thumbnail_url: '/test/url4'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url5'}, {thumbnail_url: '/test/url6'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}, {thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url5'}]);
      });

      it('should not set photos on bad value input', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}] });
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, 'test').toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, 1234).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS({w: 'ee'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
      });

      it('should format photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(result.toJS()._formattedPhotos).to.eql([{thumbnail_url: '/test/url1', updated: false}, {thumbnail_url: '/test/url2', updated: false}, {thumbnail_url: '/test/url3', updated: false}, {thumbnail_url: '/test/url4', updated: true, op: 'add'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_ADD, fromJS([{thumbnail_url: '/test/url4'}]), true);

        expect(result.toJS()._formattedPhotos).to.be.undefined;
      });
    });

    describe('replace op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(product.toJS()).to.eql({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
      });

      it('should replace photo', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}]);
      });

      it('should replace photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([{thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url3'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url4'}, {thumbnail_url: '/test/url3'}]);
      });

      it('should not replace photos if not in original _photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([undefined, {thumbnail_url: '/test/url6'}]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
      });

      it('should not replace photos on bad value input', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}] });
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, 'test').toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, 1234).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS({w: 'ee'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
      });

      it('should format photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([{thumbnail_url: '/test/url4'}]));

        expect(result.toJS()._formattedPhotos).to.eql([{thumbnail_url: '/test/url4', updated: true, op: 'replace'}, {thumbnail_url: '/test/url2', updated: false, op: ''}, {thumbnail_url: '/test/url3', updated: false, op: ''}]);
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, fromJS([{thumbnail_url: '/test/url4'}]), true);

        expect(result.toJS()._formattedPhotos).to.be.undefined;
      });
    });

    describe('delete op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([true]));

        expect(product.toJS()).to.eql({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
      });

      it('should delete photo', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([true]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}]);
      });

      it('should delete photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([true, undefined, true]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url2'}]);
      });

      it('should not delete photos if not in original _photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([undefined, true]));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
      });

      it('should not delete photos on bad value input', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}] });
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, 'test').toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, 1234).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS({w: 'ee'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}]);
      });

      it('should format photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([true]));

        expect(result.toJS()._formattedPhotos).to.eql([{thumbnail_url: '/test/url1', updated: true, op: 'del'}, {thumbnail_url: '/test/url2', updated: false, op: ''}, {thumbnail_url: '/test/url3', updated: false, op: ''}]);
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, fromJS([true]), true);

        expect(result.toJS()._formattedPhotos).to.be.undefined;
      });
    });

    describe('swap op', () => {
      it('should not change original product', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: 1, targetIdx: 3}));

        expect(product.toJS()).to.eql({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
      });

      it('should swap photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: 0, targetIdx: 2}));

        expect(result.toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url3'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url1'}]);
      });

      it('should not swap photos on bad value input', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}] });
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, 'test').toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, 1234).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({w: 'ee'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({targetIdx: 3})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({targetIdx: '3'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({targetIdx: null})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({targetIdx: {}})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({targetIdx: []})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: 1})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: '1'})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: null})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: {}})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
        expect(photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: []})).toJS()[FIELDS.PHOTOS]).to.eql([{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}]);
      });

      it('should format photos', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: 0, targetIdx: 2}));

        expect(result.toJS()._formattedPhotos).to.eql([{thumbnail_url: '/test/url3', updated: true, op: 'swap'}, {thumbnail_url: '/test/url2', updated: false, op: ''}, {thumbnail_url: '/test/url1', updated: true, op: 'swap'}]);
      });

      it('should not format text', () => {
        const product = fromJS({ [FIELDS.PHOTOS]: [{thumbnail_url: '/test/url1'}, {thumbnail_url: '/test/url2'}, {thumbnail_url: '/test/url3'}] });
        const result = photos.apply(product, BULK_EDIT_OP_CONSTS.PHOTOS_SWAP, fromJS({sourceIdx: 0, targetIdx: 2}), true);

        expect(result.toJS()._formattedPhotos).to.be.undefined;
      });
    });
  });

  describe('validate', () => {
    it('should throw error on bad input', () => {
      const inputs = [null, undefined, {}, 0, 123, '', 'qweq'];
      let errs = 0;
      _.each(inputs, input => {
        try {
          photos.validate(input);
        } catch (error) {
          errs++;
        }
      });

      expect(errs).to.eql(inputs.length);
    });

    it('should not be valid on bad photos input', () => {
      const inputs = [null, {}, 0, 123, '', 'qweq'];
      _.each(inputs, phts => {
        expect(photos.validate(fromJS({[FIELDS.PHOTOS]: phts})).toJS().valid).to.be.false;
      });
    });

    it('should be valid', () => {
      for (let i = 0; i < BULK_EDIT_VALIDATIONS.PHOTOS_MAX_LENGTH; ++i) {
        const phts = _(new Array(i)).map((val, idx) => ({thumbnail_url: `/test/url${idx}`})).value();
        expect(photos.validate(fromJS({[FIELDS.PHOTOS]: phts})).toJS().valid).to.be.true;
      }
    });

    it('should not be valid', () => {
      const phts = _(new Array(BULK_EDIT_VALIDATIONS.PHOTOS_MAX_LENGTH + 1)).map((val, idx) => ({thumbnail_url: `/test/url${idx}`})).value();
      expect(photos.validate(fromJS({[FIELDS.PHOTOS]: phts})).toJS().valid).to.be.false;
    });
  });
});
