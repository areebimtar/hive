import _ from 'lodash';
import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';
import { FIELDS } from '../../constants';

chai.use(sinonChai);

import * as productType from './productType';

describe('Shopify BulkEditOps - Product Type', () => {
  beforeEach(() => {
    productType.__Rewire__('BULK_EDIT_VALIDATIONS', { PRODUCT_TYPE_MAX_LENGTH: 5 });
  });

  afterEach(() => {
    productType.__ResetDependency__('BULK_EDIT_VALIDATIONS');
  });

  describe('validate', () => {
    it('should not be valid', () => {
      const inputs = [null, undefined, fromJS({}), 123, '', 'qwertyuiop'];
      _.each(inputs, input => {
        expect(!!productType.validate(fromJS({[FIELDS.PRODUCT_TYPE]: input}))).to.be.true;
      });
    });

    it('should be valid', () => {
      expect(!!productType.validate(fromJS({[FIELDS.PRODUCT_TYPE]: 'test'}))).to.be.false;
    });
  });
});
