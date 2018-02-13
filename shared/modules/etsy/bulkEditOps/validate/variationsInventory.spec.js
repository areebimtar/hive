import chai, {expect} from 'chai';
import sinon from 'sinon'; // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';

chai.use(sinonChai);

import * as variationsInventory from './variationsInventory';

describe('BulkEditOps - variationsInventory validate', () => {
  describe('validateProductLevelVariations', () => {
    let validateProductLevelVariations;

    beforeEach(() => {
      validateProductLevelVariations = variationsInventory.__get__('validateProductLevelVariations');
      variationsInventory.__Rewire__('MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT', 3);
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT');
    });

    it('should check for unique variation ids', () => {
      expect(validateProductLevelVariations(fromJS([{propertyId: '100'}, {propertyId: 100}]))).to.eql('Must have unique properties for each variation');
    });

    it('should check that there are at most N options in combinations list', () => {
      const variations = fromJS([
        {propertyId: '100', influencesPrice: false, influencesSku: true, options: [1, 2, 3]},
        {propertyId: '200', influencesPrice: true, influencesSku: true, options: [5, 6]}
      ]);
      expect(validateProductLevelVariations(variations)).to.eql('Use at most 3 variation combinations');
    });
  });

  describe('validateVariation', () => {
    let validateVariation;
    let validateTaxonomy;

    beforeEach(() => {
      validateTaxonomy = sinon.stub();
      variationsInventory.__Rewire__('validateTaxonomy', validateTaxonomy);
      variationsInventory.__Rewire__('MAXIMUM_NUMBER_OF_OPTIONS', 3);
      validateVariation = variationsInventory.__get__('validateVariation');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('MAXIMUM_NUMBER_OF_OPTIONS');
      variationsInventory.__ResetDependency__('validateTaxonomy');
    });

    it('should fail for bad combination of taxonomy, property and scale', () => {
      validateTaxonomy.returns(false);
      expect(validateVariation(fromJS({}))).to.eql('Choose a valid property/scale combination');
    });

    it('should validate for at least one option', () => {
      validateTaxonomy.returns(true);
      expect(validateVariation(fromJS({propertyId: '100', options: []}))).to.eql('Must have at least one option');
    });

    it('should validate maximum allowed options', () => {
      validateTaxonomy.returns(true);
      expect(validateVariation(fromJS({propertyId: '100', options: [{}]}))).to.be.null;
      expect(validateVariation(fromJS({propertyId: '100', options: [{}, {}]}))).to.be.null;
      expect(validateVariation(fromJS({propertyId: '100', options: [{}, {}, {}, {}]}))).to.eql('Must have at most 3 options');
    });
  });

  describe('validateCustomProperty', () => {
    let validateCustomProperty;
    let validateCustomPropertyOrOptionName;

    beforeEach(() => {
      validateCustomProperty = variationsInventory.validateCustomProperty;
      validateCustomPropertyOrOptionName = sinon.stub();
      variationsInventory.__Rewire__('validateCustomPropertyOrOptionName', validateCustomPropertyOrOptionName);

      validateCustomProperty('te$t');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateCustomPropertyOrOptionName');
    });

    it('should pass unchanged value', () => {
      expect(validateCustomPropertyOrOptionName).to.have.been.calledOnce;
      expect(validateCustomPropertyOrOptionName.args[0][0]).eql('te$t');
    });

    it('should pass max allowed characters const', () => {
      expect(validateCustomPropertyOrOptionName).to.have.been.calledOnce;
      expect(validateCustomPropertyOrOptionName.args[0][1]).eql(45);
    });
  });

  describe('validateOption', () => {
    let validateOption;
    let validateCustomPropertyOrOptionName;

    beforeEach(() => {
      validateOption = variationsInventory.validateOption;
      validateCustomPropertyOrOptionName = sinon.stub();
      variationsInventory.__Rewire__('validateCustomPropertyOrOptionName', validateCustomPropertyOrOptionName);

      validateOption('te$t');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateCustomPropertyOrOptionName');
    });

    it('should pass unchanged value', () => {
      expect(validateCustomPropertyOrOptionName).to.have.been.calledOnce;
      expect(validateCustomPropertyOrOptionName.args[0][0]).eql('te$t');
    });

    it('should pass max allowed characters const', () => {
      expect(validateCustomPropertyOrOptionName).to.have.been.calledOnce;
      expect(validateCustomPropertyOrOptionName.args[0][1]).eql(20);
    });
  });

  describe('validateOfferingsVisibility', () => {
    let validateOfferingsVisibility;

    beforeEach(() => {
      validateOfferingsVisibility = variationsInventory.__get__('validateOfferingsVisibility');
    });

    it('should be valid if there is at least one visible offering', () => {
      expect(validateOfferingsVisibility(fromJS([{visibility: false}, {visibility: true}, {visibility: false}]))).to.eql(null);
    });

    it('should not be valid if there are no visible offerings', () => {
      expect(validateOfferingsVisibility(fromJS([{visibility: false}, {visibility: false}, {visibility: false}]))).to.eql('At least one offering must be visible');
    });
  });

  describe('validateVariations', () => {
    let validateVariations;
    let validateProductLevelVariations;
    let validateVariation;
    let validateOption;

    beforeEach(() => {
      validateProductLevelVariations = sinon.stub();
      validateVariation = sinon.stub();
      validateOption = sinon.stub();
      variationsInventory.__Rewire__('validateProductLevelVariations', validateProductLevelVariations);
      variationsInventory.__Rewire__('validateVariation', validateVariation);
      variationsInventory.__Rewire__('validateOption', validateOption);
      validateVariations = variationsInventory.__get__('validateVariations');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateProductLevelVariations');
      variationsInventory.__ResetDependency__('validateVariation');
      variationsInventory.__ResetDependency__('validateOption');
    });

    it('should fail if variations product level fails', () => {
      const variations = fromJS([{options: [{}]}]);
      validateProductLevelVariations.returns('error');
      validateVariation.returns(null);
      validateOption.returns(null);

      expect(validateVariations(variations).toJS()).to.eql({
        valid: false,
        data: {
          status: 'error', variations: [{status: null, options: [null]}]
        }
      });
    });

    it('should fail if variation fails', () => {
      const variations = fromJS([{options: [{}]}]);
      validateProductLevelVariations.returns(null);
      validateVariation.returns('error');
      validateOption.returns(null);

      expect(validateVariations(variations).toJS()).to.eql({
        valid: false,
        data: {
          status: null, variations: [{status: 'error', options: [null]}]
        }
      });
    });

    it('should fail if option fails', () => {
      const variations = fromJS([{options: [{}]}]);
      validateProductLevelVariations.returns(null);
      validateVariation.returns(null);
      validateOption.returns('error');

      expect(validateVariations(variations).toJS()).to.eql({
        valid: false,
        data: {
          status: null, variations: [{status: null, options: ['error']}]
        }
      });
    });
  });

  describe('validateAllOfferings', () => {
    let validateAllOfferings;

    beforeEach(() => {
      validateAllOfferings = variationsInventory.__get__('validateAllOfferings');
    });

    it('should check valid combinations', () => {
      const offerings = fromJS([
        { variationOptions: [{variationId: '11', optionId: '21'}] },
        { variationOptions: [{variationId: '12', optionId: '22'}] },
        { variationOptions: [{variationId: '11', optionId: '21'}] }
      ]);
      expect(validateAllOfferings(offerings)).to.eql('Must have unique combinations of options');
    });
  });

  describe('validateOffering', () => {
    let validateOffering;

    beforeEach(() => {
      validateOffering = variationsInventory.__get__('validateOffering');
    });

    it('should get status from validator', () => {
      expect(validateOffering(fromJS({variationOptions: ['opt1', 'opt2', 'opt1'], type: 'value'}), 'type', () => 'error')).to.eql('error');
    });

    it('should validate uniq options', () => {
      expect(validateOffering(fromJS({variationOptions: ['opt1', 'opt2', 'opt1'], type: 'value'}), 'type', () => null)).to.eql('Must have unique combination of options');
    });
  });

  describe('validateOfferings', () => {
    let validateOfferings;
    let validateAllOfferings;
    let validateOffering;

    beforeEach(() => {
      validateAllOfferings = sinon.stub();
      validateOffering = sinon.stub();
      variationsInventory.__Rewire__('validateAllOfferings', validateAllOfferings);
      variationsInventory.__Rewire__('validateOffering', validateOffering);
      validateOfferings = variationsInventory.__get__('validateOfferings');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateAllOfferings');
      variationsInventory.__ResetDependency__('validateOffering');
      variationsInventory.__ResetDependency__('validateOption');
    });

    it('should fail if offerings level fails', () => {
      const offerings = fromJS([{}, {}]);
      validateAllOfferings.returns('error');
      validateOffering.returns(null);

      expect(validateOfferings(offerings).toJS()).to.eql({
        valid: false,
        data: {
          status: 'error', offerings: [null, null]
        }
      });
    });

    it('should fail if offering fails', () => {
      const offerings = fromJS([{options: [{}]}]);
      validateAllOfferings.returns(null);
      validateOffering.returns('error');

      expect(validateOfferings(offerings).toJS()).to.eql({
        valid: false,
        data: {
          status: null, offerings: ['error']
        }
      });
    });
  });

  describe('validateVariationsAndOfferings', () => {
    let validateVariationsAndOfferings;
    let validateVariations;
    let validateOfferings;
    let validateOfferingsVisibility;

    beforeEach(() => {
      validateVariations = sinon.stub();
      validateOfferings = sinon.stub();
      validateOfferingsVisibility = sinon.stub();

      variationsInventory.__Rewire__('validateVariations', validateVariations);
      variationsInventory.__Rewire__('validateOfferings', validateOfferings);
      variationsInventory.__Rewire__('validateOfferingsVisibility', validateOfferingsVisibility);
      validateVariationsAndOfferings = variationsInventory.__get__('validateVariationsAndOfferings');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateVariations');
      variationsInventory.__ResetDependency__('validateOfferings');
      variationsInventory.__ResetDependency__('validateOfferingsVisibility');
    });

    it('should validate variations', () => {
      validateVariations.returns(fromJS({valid: false}));
      validateOfferings.returns(fromJS({valid: true}));
      validateOfferingsVisibility.returns(fromJS({valid: true}));

      const result = validateVariationsAndOfferings(fromJS([{propertyId: '123'}]), fromJS([])).toJS();

      expect(result.valid).to.be.false;
      expect(result.data).to.be.defined;
    });

    it('should validate offerings', () => {
      validateVariations.returns(fromJS({valid: true}));
      validateOfferings.returns(fromJS({valid: false}));
      validateOfferingsVisibility.returns(null);

      const result = validateVariationsAndOfferings(fromJS([{propertyId: '123'}]), fromJS([])).toJS();

      expect(result.valid).to.be.false;
      expect(result.data).to.be.defined;

      expect(validateOfferings).to.have.callCount(4);
      expect(validateOfferings).to.have.been.calledWithExactly(fromJS([]), 'price', false);
      expect(validateOfferings).to.have.been.calledWithExactly(fromJS([]), 'quantity', false);
      expect(validateOfferings).to.have.been.calledWithExactly(fromJS([]), 'sku', true);
      expect(validateOfferings).to.have.been.calledWithExactly(fromJS([]), 'visibility', false);
    });
  });

  describe('validate', () => {
    let validate;
    let validateVariationsAndOfferings;

    beforeEach(() => {
      validateVariationsAndOfferings = sinon.stub().returns('result');
      variationsInventory.__Rewire__('validateVariationsAndOfferings', validateVariationsAndOfferings);
      validate = variationsInventory.__get__('validate', validate);
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('validateVariationsAndOfferings');
    });

    it('should validate product', () => {
      expect(validate(fromJS({can_write_inventory: true, variations: {1: 'variations'}, productOfferings: ['po1', 'po2']}))).to.eql('result');

      expect(validateVariationsAndOfferings).to.have.been.calledOnce;
      expect(validateVariationsAndOfferings).to.have.been.calledWithExactly(fromJS(['variations']), fromJS(['po1', 'po2']), false, null);
    });

    it('should be valid if inventory cannot be updated', () => {
      const product = fromJS({ can_write_inventory: false });

      expect(validate(product).get('valid')).to.be.true;
    });
  });

  describe('validateCustomPropertyOrOptionName', () => {
    let validateCustomPropertyOrOptionName;

    beforeEach(() => {
      validateCustomPropertyOrOptionName = variationsInventory.__get__('validateCustomPropertyOrOptionName');
    });

    it('should be valid name', () => {
      expect(validateCustomPropertyOrOptionName('asd aqwe', 20)).to.eql(null);
    });

    it('should not allow ^ $ ` characters', () => {
      expect(validateCustomPropertyOrOptionName('asd^ aqwe', 20)).to.eql('You may not include any of these characters: ^ $ `');
      expect(validateCustomPropertyOrOptionName('asd$ aqwe', 20)).to.eql('You may not include any of these characters: ^ $ `');
      expect(validateCustomPropertyOrOptionName('asd` aqwe', 20)).to.eql('You may not include any of these characters: ^ $ `');
    });

    it('should be shorter than max allowed characters', () => {
      expect(validateCustomPropertyOrOptionName('qwertyuiopqwertyuiop', 20)).to.eql(null);
      expect(validateCustomPropertyOrOptionName('qwertyuiopqwertyuiopq', 20)).to.eql('Must be shorter than 20 chars');
    });
  });
});
