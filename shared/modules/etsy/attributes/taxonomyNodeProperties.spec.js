import _ from 'lodash';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';

import module, { getUiState, getUiStateForAttributes, validateTaxonomy, getAttribute, getAttributeOptionById } from './taxonomyNodeProperties';
import * as COMMON_PROPERTIES from './data/COMMON_PROPERTIES';
import STANDARD_PROPERTIES from './data/STANDARD_PROPERTIES.json';

chai.use(sinonChai);

const SCARVES_TAX_ID = 46;
const ACCESSORIES_TAX_ID = 1;
const BASEBALL_AND_TRUCKER_HATS_TAX_ID = 26;
const OCCASION_PROPERTY_ID = 46803063641;
const COLOR_PROPERTY_ID = 200;
const WEIGHT_PROPERTY_ID = 511;
const CLIP_ART_TAX_ID = 2817;

describe('TaxonomyNodeProperties', () => {
  describe('uiState for variations', ()=> {
    it('Represents the blank UI state properly', () => {
      const uiState = getUiState().toJS();
      expect(uiState.availableVariations).to.be.an('Array').with.length(0);
      expect(uiState.availableAttributes).to.not.exist;
      expect(uiState.availableScales).to.be.an('Array').with.length(0);
      expect(uiState.availableOptions).to.be.an('Array').with.length(0);
      expect(uiState.readyForOptions).to.be.false;
    });

    it('Contains correct properties for taxonomies with no overrides', () => {
      const uiState = getUiState({taxonomyId: ACCESSORIES_TAX_ID}).toJS();
      const propertyIds = _.pluck(uiState.availableVariations, 'id');
      expect(propertyIds).to.have.all.members(COMMON_PROPERTIES.COMMON_VARIATION_PROPERTY_IDS.filter(id => id !== 513 && id !== 514));
    });

    it('Contains correct properties for for taxonomies with overrides', () => {
      const uiState = getUiState({taxonomyId: SCARVES_TAX_ID}).toJS();
      const extraPropertyIds = [47626759838, 47626759898];
      const missingPropertyIds = [506, 512, 513, 514];
      const allProperties = _.union(uiState.availableVariations, uiState.availableAttributes);
      const foundPropertyIds = _.pluck(allProperties, 'id');
      expect(foundPropertyIds).to.include.all.members(extraPropertyIds);
      _.forEach(COMMON_PROPERTIES.COMMON_VARIATION_PROPERTY_IDS, (commonId) => {
        if (_.includes(missingPropertyIds, commonId)) {
          expect(foundPropertyIds).not.to.include(commonId);
        } else {
          expect(foundPropertyIds).to.include(commonId);
        }
      });
    });

    it('Uses Custom overrides for property names', () => {
      const uiState = getUiState({taxonomyId: ACCESSORIES_TAX_ID}).toJS();
      const variationProperties = uiState.availableVariations;
      const colorProperty = _.find(variationProperties, {id: COLOR_PROPERTY_ID});
      expect(colorProperty).to.have.property('displayName', 'Color (primary)');
    });

    it('Sorts the property names alphabetically', () => {
      const uiState = getUiState({taxonomyId: ACCESSORIES_TAX_ID}).toJS();
      const propertyNames = _.pluck(uiState.availableVariations, 'displayName');
      const sortedNames = propertyNames.slice(0).sort();
      expect(propertyNames).to.eql(sortedNames);
    });

    it('Returns the expected scales on a standard property', () => {
      const tnp = getUiState({taxonomyId: ACCESSORIES_TAX_ID, propertyId: WEIGHT_PROPERTY_ID}).toJS();
      const weightProperty = _.find(tnp.availableVariations, {id: WEIGHT_PROPERTY_ID});
      expect(weightProperty).to.have.property('name', 'Weight');

      const scales = tnp.availableScales;
      expect(scales).to.have.property('length', 4);
      const grams = _.find(scales, {id: 333});
      expect(grams.name).to.equal('Grams');
    });

    it('Finds overrides for display names for scales', () => {
      const volumePropertyId = 52047898162;
      // essential oils calls it Volume Fragrances calls it size.
      const essentialOilsTnp = getUiState({taxonomyId: 215}).toJS();
      const fragrancesTnp = getUiState({taxonomyId: 216}).toJS();

      expect(_.find(essentialOilsTnp.availableVariations, {id: volumePropertyId}).displayName).to.equal('Volume');
      expect(_.find(fragrancesTnp.availableVariations, {id: volumePropertyId}).displayName).to.equal('Size');
    });

    it('Respects extra and missing scales', () => {
      // these are from the raw data
      const tnp = getUiState({taxonomyId: BASEBALL_AND_TRUCKER_HATS_TAX_ID, propertyId: 100}).toJS();
      const scales = tnp.availableScales;
      const scaleIds = _.pluck(scales, 'id');
      expect(scaleIds).to.have.all.members([266817059, 266817061, 266817065, 266817067, 266817069, 266817071, 266817073, 266817077, 266817079, 266817081, 266817083, 266817085, 302326609]);
      const missingScales = [301, 327, 328, 329, 335, 336, 337];
      _.forEach(missingScales, (scaleId) => {
        expect(_.includes(scaleIds, scaleId)).to.be.false;
      });
    });

    it('Returns options with a scale-less property like color', () => {
      const tnp = getUiState({taxonomyId: CLIP_ART_TAX_ID, propertyId: COLOR_PROPERTY_ID}).toJS();
      const colorOptionsNames = _.pluck(tnp.availableOptions, 'name');
      expect(colorOptionsNames).to.have.length(19);
      expect(colorOptionsNames).to.contain.all.members(['Red', 'Yellow', 'Bronze']);
    });

    it(`End to end scenario for men's jeans`, () => {
      const mensJeansTaxId = 2826;  // Clothing, men's clothing, jeans
      const pantsSizePropertyId = 62809790419;
      const letterSizeScaleId = 44;

      // start with just the taxonomy ID
      let uiState = getUiState({taxonomyId: mensJeansTaxId}).toJS();
      // Pants size property should be available as both a variation and at the top level
      expect(_.find(uiState.availableAttributes, {id: pantsSizePropertyId})).to.not.exist;
      expect(_.find(uiState.availableVariations, {id: pantsSizePropertyId})).to.exist;
      expect(uiState.availableScales).to.have.length(0);
      expect(uiState.availableOptions).to.have.length(0);
      expect(uiState.readyForOptions).to.be.false;

      // now add the property id and get scales back
      uiState = getUiState({taxonomyId: mensJeansTaxId, propertyId: pantsSizePropertyId}).toJS();
      expect(_.find(uiState.availableAttributes, {id: pantsSizePropertyId})).to.not.exist;
      expect(_.find(uiState.availableVariations, {id: pantsSizePropertyId})).to.exist;
      expect(uiState.availableScales).to.have.length(2);
      expect(_.pluck(uiState.availableScales, 'name')).to.have.all.members(['Inches, waist', 'US']);
      expect(uiState.availableOptions).to.have.length(0);
      expect(uiState.readyForOptions).to.be.false;

      // finally select a scale:
      uiState = getUiState({
        taxonomyId: mensJeansTaxId,
        propertyId: pantsSizePropertyId,
        scaleId: letterSizeScaleId
      }).toJS();
      expect(_.find(uiState.availableAttributes, {id: pantsSizePropertyId})).to.not.exist;
      expect(_.find(uiState.availableVariations, {id: pantsSizePropertyId})).to.exist;
      expect(uiState.availableScales).to.have.length(2);
      expect(_.pluck(uiState.availableScales, 'name')).to.have.all.members(['Inches, waist', 'US']);
      expect(uiState.readyForOptions).to.be.true;
      expect(uiState.availableOptions).to.have.length(10);
      expect(_.pluck(uiState.availableOptions, 'name')).to.contain.all.members(['XXS', 'XS', 'S', 'M', 'L', 'XL', '2X', '3X', '4X', 'One size']);
    });
  });

  describe('uiState for attributes', () => {
    const standardOccasionOptionIds = STANDARD_PROPERTIES[OCCASION_PROPERTY_ID].suggestedOptionIds;

    it('Retrieves the correct options for occasion for a generic taxonomy', () => {
      const uiState = getUiStateForAttributes({ taxonomyId: SCARVES_TAX_ID, propertyId: OCCASION_PROPERTY_ID }).toJS();
      expect(uiState.availableAttributes).to.exist;
      expect(uiState.availableVariations).to.not.exist;
      expect(_.pluck(uiState.availableOptions, 'id')).to.have.all.members(standardOccasionOptionIds);
      expect(_.find(uiState.availableOptions, {name: 'Birthday'})).to.exist;
    });

    it('Still retrieves all occasions if no taxonomy is supplied', () => {
      const uiState = getUiStateForAttributes({ propertyId: OCCASION_PROPERTY_ID }).toJS();
      expect(uiState.availableAttributes).to.exist;
      expect(uiState.availableVariations).to.not.exist;
      expect(_.pluck(uiState.availableOptions, 'id')).to.have.all.members(standardOccasionOptionIds);
      expect(_.find(uiState.availableOptions, {name: 'Birthday'})).to.exist;
    });

    it('Retrieves a custom list of occasions for Party Candles', () => {
      const PARTY_CANDLES = 6611;
      const uiState = getUiStateForAttributes({ taxonomyId: PARTY_CANDLES, propertyId: OCCASION_PROPERTY_ID }).toJS();
      expect(uiState.availableAttributes).to.exist;
      expect(uiState.availableVariations).to.not.exist;
      expect(_.pluck(uiState.availableOptions, 'id')).to.not.have.all.members(standardOccasionOptionIds);
      expect(_.find(uiState.availableOptions, {name: 'Birthday'})).to.exist;
      expect(_.find(uiState.availableOptions, {name: 'Divorce'})).to.not.exist;
    });

    it('Retrieves the single required occasion for weddings-related taxonomy', () => {
      const BRIDAL_SETS_TAXONOMY_ID = 1243;
      const uiState = getUiStateForAttributes({ taxonomyId: BRIDAL_SETS_TAXONOMY_ID, propertyId: OCCASION_PROPERTY_ID }).toJS();
      expect(uiState.availableAttributes).to.exist;
      expect(uiState.availableVariations).to.not.exist;
      expect(uiState.availableOptions).to.exist.and.have.length(1);
      expect(uiState.required).to.be.true;
    });

    it(`Does not provide occasion as an option for taxonomies that don't support them`, () => {
      const BRUSHES_TAXONOMY_ID = 6216;
      const uiState = getUiStateForAttributes({ taxonomyId: BRUSHES_TAXONOMY_ID}).toJS();
      expect(uiState.availableVariations).to.not.exist;
      expect(uiState.availableAttributes).to.exist;
      const attributeIds = _.pluck(uiState.availableAttributes, 'id');
      expect(_.includes(attributeIds, COLOR_PROPERTY_ID)).to.be.true;
      expect(_.includes(attributeIds, OCCASION_PROPERTY_ID)).to.be.false;
    });

    it(`Gives an empty list of availableOptions for taxonomies that don't support occasion`, () => {
      const BRUSHES_TAXONOMY_ID = 6216;
      const uiState = getUiStateForAttributes({ taxonomyId: BRUSHES_TAXONOMY_ID, propertyId: OCCASION_PROPERTY_ID }).toJS();
      expect(uiState.availableOptions).to.exist.and.have.length(0);
    });
  });

  describe('validateTaxonomy', () => {
    let getAvailablePropertyIds;
    let getAvailableScaleIds;

    beforeEach(() => {
      getAvailablePropertyIds = sinon.stub();
      getAvailableScaleIds = sinon.stub();

      module.__Rewire__('getAvailablePropertyIds', getAvailablePropertyIds);
      module.__Rewire__('getAvailableScaleIds', getAvailableScaleIds);
    });

    afterEach(() => {
      module.__ResetDependency__('getAvailablePropertyIds');
      module.__ResetDependency__('getAvailableScaleIds');
    });

    it('should fail if taxonomy is missing', () => {
      expect(validateTaxonomy()).to.be.false;
      expect(validateTaxonomy(null)).to.be.false;
      expect(validateTaxonomy('')).to.be.false;
    });

    it('should fail if property id is not valid for given taxonomy', () => {
      getAvailablePropertyIds.returns(fromJS([1, 2, 4, 5]));

      expect(validateTaxonomy('123', 3)).to.be.false;
      expect(validateTaxonomy('123', 6)).to.be.false;
    });

    it('should pass if property id is valid for given taxonomy', () => {
      getAvailablePropertyIds.returns(fromJS([1, 2, 4, 5]));
      getAvailableScaleIds.returns(fromJS([]));

      expect(validateTaxonomy('123', 2)).to.be.true;
      expect(validateTaxonomy('123', 5)).to.be.true;
    });

    it('should fail if scale option id is not valid for given taxonomy and property id', () => {
      getAvailablePropertyIds.returns(fromJS([1, 2, 4, 5]));
      getAvailableScaleIds.returns(fromJS([11, 12, 14, 15]));

      expect(validateTaxonomy('123', 4, 13)).to.be.false;
      expect(validateTaxonomy('123', 4, 16)).to.be.false;
    });

    it('should pass if scale option id is valid for given taxonomy and property id', () => {
      getAvailablePropertyIds.returns(fromJS([1, 2, 4, 5]));
      getAvailableScaleIds.returns(fromJS([11, 12, 14, 15]));

      expect(validateTaxonomy('123', 4, 12)).to.be.true;
      expect(validateTaxonomy('123', 4, 15)).to.be.true;
    });

    it('should fail if scale option id is empty but given taxonomy and property id has scale options (eg scale id was not set yet)', () => {
      getAvailablePropertyIds.returns(fromJS([1, 2, 4, 5]));
      getAvailableScaleIds.returns(fromJS([11, 12, 14, 15]));

      expect(validateTaxonomy('123', 4, undefined, true)).to.be.false;
      expect(validateTaxonomy('123', 4, null, true)).to.be.false;
    });
  });

  describe('getAttribute', () => {
    let getAttributePropertyId;
    let getUiStateForAttributesOrVariations;

    beforeEach(() => {
      getAttributePropertyId = sinon.stub().returns('123');
      getUiStateForAttributesOrVariations = sinon.stub();
      module.__Rewire__('getAttributePropertyId', getAttributePropertyId);
      module.__Rewire__('getUiStateForAttributesOrVariations', getUiStateForAttributesOrVariations);
      module.__Rewire__('attributeCache', fromJS({}));
    });

    afterEach(() => {
      module.__ResetDependency__('getAttributePropertyId');
      module.__ResetDependency__('getUiStateForAttributesOrVariations');
      module.__ResetDependency__('attributeCache');
    });

    it('should capitalize all words', () => {
      const state = {availableOptions: [
        {name: 'word'},
        {name: 'two words'},
        {name: 'three words'},
        {name: 'word & word'},
        {name: 'word\tword'},
        {name: 'word\nword'},
        {name: 'word\'n word'}
      ]};
      getUiStateForAttributesOrVariations.returns(fromJS(state));

      const result = getAttribute().toJS();
      expect(result.availableOptions).to.eql([
        {name: 'Word'},
        {name: 'Two Words'},
        {name: 'Three Words'},
        {name: 'Word & Word'},
        {name: 'Word Word'},
        {name: 'Word Word'},
        {name: 'Word\'n Word'}
      ]);
    });
  });

  describe('getAttributeOptionById', () => {
    const BIRTHDAY_ID = 19;
    const CINCO_DE_MAYO_ID_STRING = '36';

    it(`Can find an option specified by number`, () => {
      const option = getAttributeOptionById('occasion', BIRTHDAY_ID);
      expect(option).to.exist;
      expect(option.get('name')).to.eql('Birthday');
    });

    it(`Can find an option specified by string`, () => {
      const option = getAttributeOptionById('holiday', CINCO_DE_MAYO_ID_STRING);
      expect(option).to.exist;
      expect(option.get('name')).to.eql('Cinco De Mayo');
    });

    it(`Returns nothing if a non-existent option ID is passed in`, () => {
      const option = getAttributeOptionById('occasion', 999);
      expect(option).not.to.exist;
    });

    it(`Returns nothing if a non-existent attrbute is passed in`, () => {
      const option = getAttributeOptionById('blahblah', 1);
      expect(option).not.to.exist;
    });
  });
});
