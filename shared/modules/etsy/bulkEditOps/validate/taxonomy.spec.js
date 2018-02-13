import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import module, { validate } from './taxonomy';

chai.use(sinonChai);

describe('Taxonomy - validate', () => {
  describe('validate', ()=> {
    let validateTaxonomy;

    beforeEach(() => {
      validateTaxonomy = sinon.stub();
      module.__Rewire__('validateTaxonomy', validateTaxonomy);
    });

    afterEach(() => {
      module.__ResetDependency__('validateTaxonomy');
    });

    it('should not set error if there are no variations', () => {
      validateTaxonomy.returns(false);
      const product = fromJS({ taxonomy_id: '123' });
      const error = validate(product);

      expect(error).to.be.null;
    });

    it('should not set error on valid combination', () => {
      validateTaxonomy.returns(true);
      const product = fromJS({ taxonomy_id: '123', variations: [{propertyId: 1, scalingOptionId: 2}] });
      const error = validate(product);

      expect(error).to.be.null;
    });

    it('should set error on missing taxonomy ID', () => {
      validateTaxonomy.returns(false);
      const product = fromJS({ taxonomy_id: null });
      const error = validate(product);

      expect(error).to.eql('Category ID must be set');
    });

    it('should set error on invalid combination', () => {
      validateTaxonomy.returns(false);
      const product = fromJS({ taxonomy_id: '123', variations: [{propertyId: 1, scalingOptionId: 2}] });
      const error = validate(product);

      expect(error).to.eql('The selected category is not compatible with the variations of this listing');
    });

    it('should set error on invalid combination in first variation', () => {
      validateTaxonomy.onFirstCall().returns(false);
      validateTaxonomy.onSecondCall().returns(true);
      const product = fromJS({ taxonomy_id: '123', variations: [{propertyId: 1, scalingOptionId: 2}, {propertyId: 11, scalingOptionId: 22}] });
      const error = validate(product);

      expect(error).to.eql('The selected category is not compatible with the variations of this listing');
    });

    it('should set error on invalid combination in second variation', () => {
      validateTaxonomy.onFirstCall().returns(true);
      validateTaxonomy.onSecondCall().returns(false);
      const product = fromJS({ taxonomy_id: '123', variations: [{propertyId: 1, scalingOptionId: 2}, {propertyId: 11, scalingOptionId: 22}] });
      const error = validate(product);

      expect(error).to.eql('The selected category is not compatible with the variations of this listing');
    });
  });
});
