import _ from 'lodash';
import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';
import { FIELDS } from '../../constants';

chai.use(sinonChai);

import * as vendor from './vendor';

describe('Shopify BulkEditOps - Vendor', () => {
  beforeEach(() => {
    vendor.__Rewire__('BULK_EDIT_VALIDATIONS', { VENDOR_MAX_LENGTH: 5 });
  });

  afterEach(() => {
    vendor.__ResetDependency__('BULK_EDIT_VALIDATIONS');
  });

  describe('validate', () => {
    it('should not be valid', () => {
      const inputs = [null, undefined, fromJS({}), 123, '', 'qwertyuiop'];
      _.each(inputs, input => {
        expect(!!vendor.validate(fromJS({[FIELDS.VENDOR]: input}))).to.be.true;
      });
    });

    it('should be valid', () => {
      expect(!!vendor.validate(fromJS({[FIELDS.VENDOR]: 'test'}))).to.be.false;
    });
  });
});
