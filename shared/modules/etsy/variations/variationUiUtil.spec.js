import {expect, assert} from 'chai';
import sinon from 'sinon';
import _ from 'lodash';
import * as uiUtil from './variationUiUtil';


const verifyPropertySelection = (contents) => {
  const NON_CUSTOM_PROPERTY_NAMES = ['Color', 'Diameter', 'Dimensions', 'Fabric', 'Material', 'Pattern', 'Scent', 'Size', 'Style', 'Weight', 'Width', 'Device', 'Finish', 'Flavor', 'Height', 'Length'];
  expect(contents).to.be.an('array').with.length(NON_CUSTOM_PROPERTY_NAMES.length);
  _.forEach(NON_CUSTOM_PROPERTY_NAMES, (propertyName) => {
    const configuredItem = _.find(contents, { name: propertyName });
    expect(configuredItem).to.exist;
  });
};

describe('variationUtil', () => {
  // these taxonomy ids supports sizes with different recipient types
  const MENS_T_SHIRTS = 449;
  const GIRLS_DRESSES = 419;

  // this taxonomy id does not support recipients
  const CLIP_ART = 2817;

  const COLOR_PROPERTY = 200;
  const SIZE_PROPERTY = 100;
  const WEIGHT_PROPERTY = 511;
  const STYLE_PROPERTY = 510;

  const GIRLS_RECIPIENT_ID = 266817077;
  const BABY_GIRLS = 266817083;

  describe('Selecting properties and qualifiers property value', () => {
    it('Before configuration, the UI state has all non-custom properties', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS);
      expect(uiState.selectors).to.be.an('array').and.have.length(1);
      const propertySelectors = uiState.selectors[0];
      expect(propertySelectors).to.have.property('type', 'property');
      expect(propertySelectors).to.have.property('list').and.be.an('array');
      verifyPropertySelection(propertySelectors.list);
    });

    it('The non-custom properties are sorted alphabetically', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS);
      expect(uiState.selectors).to.be.an('array').and.have.length(1);
      const propertySelectors = uiState.selectors[0];
      expect(propertySelectors).to.have.property('type', 'property');
      expect(propertySelectors).to.have.property('list').and.be.an('array');
      for (let i = 0; i < propertySelectors.list.length - 1; i++) {
        const first = propertySelectors.list[i].name;
        const second = propertySelectors.list[i + 1].name;
        assert(first < second, `${first} and ${second} in wrong order`);
      }
    });

    it('When choosing a property, the UI state for property updates', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS, { property_id: COLOR_PROPERTY });
      const propertySelectors = uiState.selectors[0];
      expect(propertySelectors).to.have.property('type', 'property');
      expect(propertySelectors).to.have.property('list').and.be.an('array');
      verifyPropertySelection(propertySelectors.list);
    });

    it('There are no qualifiers for Color', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS, { property_id: COLOR_PROPERTY });
      expect(uiState.selectors.length).to.equal(1);
      expect(uiState.selectors[0].type).to.equal('property');
    });

    it('There are scale qualifiers but not recipient qualifiers for weight on Mens TShirt foofoo', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS, { property_id: WEIGHT_PROPERTY });
      expect(uiState.selectors.length).to.equal(2);
      expect(uiState.selectors[0].type).to.equal('property');
      expect(uiState.selectors[1].type).to.equal('scale');
      expect(uiState.selectors[1].list).to.deep.include.members([
        { name: 'Ounces', value: 331 },
        { name: 'Pounds', value: 332 },
        { name: 'Grams', value: 333 },
        { name: 'Kilograms', value: 334 }
      ]);
    });

    it('There are scale qualifiers for size on clip art', () => {
      const uiState = uiUtil.getUIState(CLIP_ART, { property_id: SIZE_PROPERTY });
      expect(uiState.selectors.length).to.equal(2);
      expect(uiState.selectors[0].type).to.equal('property');
      expect(uiState.selectors[1].type).to.equal('scale');
      expect(uiState.selectors[1].list).to.deep.include.members([
        { name: 'Inches', value: 327 },
        { name: 'Alpha', value: 301 }
      ]);
    });

    it('There are recipient qualifiers on girls dresses but not scale qualifiers', () => {
      const uiState = uiUtil.getUIState(GIRLS_DRESSES, { property_id: SIZE_PROPERTY });
      expect(uiState.selectors.length).to.equal(2);
      expect(uiState.selectors[0].type).to.equal('property');
      expect(uiState.selectors[1].type).to.equal('recipient');
      expect(uiState.selectors[1].list).to.eql([
        { name: 'Baby Girls', value: 266817083 },
        { name: 'Babies', value: 266817085 },
        { name: 'Children', value: 266817079 },
        { name: 'Girls', value: 266817077 },
        { name: 'Teen Girls', value: 266817069 },
        { name: 'Teens', value: 266817071 }
      ]);
    });

    it('Mens T-shirts has different recipient qualifiers than girls dresses', () => {
      const uiState = uiUtil.getUIState(MENS_T_SHIRTS, { property_id: SIZE_PROPERTY });
      expect(uiState.selectors.length).to.equal(2);
      expect(uiState.selectors[0].type).to.equal('property');
      expect(uiState.selectors[1].type).to.equal('recipient');
      expect(uiState.selectors[1].list).to.eql([
        { name: 'Men', value: 266817059 },
        { name: 'Teens', value: 266817071 },
        { name: 'Teen Boys', value: 266817067 },
        { name: 'Unisex Adults', value: 266817065 },
        { name: 'Not specified', value: 302326609 }
      ]);
    });

    it('Selecting a recipient for girls dresses populates scales', () => {
      const uiState = uiUtil.getUIState(GIRLS_DRESSES, { property_id: SIZE_PROPERTY, recipient_id: GIRLS_RECIPIENT_ID});
      expect(uiState.selectors.length).to.equal(3);
      expect(uiState.selectors[0].type).to.equal('property');
      expect(uiState.selectors[1].type).to.equal('recipient');
      expect(uiState.selectors[2].type).to.equal('scale');
      expect(uiState.selectors[2].list).to.eql([
        {name: 'Alpha', value: 301 },
        {name: 'EU', value: 385 },
        {name: 'JP', value: 386 },
        {name: 'UK', value: 384 },
        {name: 'US', value: 320 }
      ]);
    });
  });

  describe('Configuring options', () => {
    it('Requires that a property be selected to allow options', () => {
      expect(uiUtil.getUIState(CLIP_ART, {}).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(CLIP_ART, { property_id: COLOR_PROPERTY }).canAcceptOptions).to.be.true;
    });

    it('Requires that the scale qualifier be populated when needed', () => {
      const partialConfig = { property_id: WEIGHT_PROPERTY };
      const partialConfig2 = { scale_id: 331};
      const fullConfig = { property_id: WEIGHT_PROPERTY, scale_id: 331 };
      expect(uiUtil.getUIState(MENS_T_SHIRTS, partialConfig).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(MENS_T_SHIRTS, partialConfig2).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(MENS_T_SHIRTS, fullConfig).canAcceptOptions).to.be.true;
    });

    it('Requires both recipient and scale qualifiers when needed', () => {
      const partialConfig1 = { property_id: SIZE_PROPERTY };
      const partialConfig2 = { property_id: SIZE_PROPERTY, recipient_id: GIRLS_RECIPIENT_ID };
      const partialConfig3 = { property_id: SIZE_PROPERTY, scale_id: 320 }; // US sizes
      const fullConfig = { property_id: SIZE_PROPERTY, recipient_id: GIRLS_RECIPIENT_ID, scale_id: 320 };

      expect(uiUtil.getUIState(GIRLS_DRESSES, partialConfig1).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(GIRLS_DRESSES, partialConfig2).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(GIRLS_DRESSES, partialConfig3).canAcceptOptions).to.be.false;
      expect(uiUtil.getUIState(GIRLS_DRESSES, fullConfig).canAcceptOptions).to.be.true;
    });

    it('The style property has no suggested options', () => {
      const clipArtUIConfig = uiUtil.getUIState(CLIP_ART, { property_id: STYLE_PROPERTY });
      expect(clipArtUIConfig.canAcceptOptions).to.be.true;
      expect(clipArtUIConfig.suggestedOptions).to.be.an('array').and.have.length(0);
    });

    it('The color property has 11 suggested options', () => {
      const clipArtUIConfig = uiUtil.getUIState(CLIP_ART, { property_id: COLOR_PROPERTY });
      expect(clipArtUIConfig.canAcceptOptions).to.be.true;
      expect(clipArtUIConfig.suggestedOptions).to.be.an('array').and.have.length(11);
      _.forEach(['Black', 'Red', 'White', 'Green'], (colorName) => {
        expect(_.find(clipArtUIConfig.suggestedOptions, { name: colorName, formatted_name: colorName })).to.exist;
      });
    });

    it('Girls dresses for baby girls in months has 9 options', () => {
      const MONTHS_SCALE_ID = 303;
      const dataConfig = { property_id: SIZE_PROPERTY, recipient_id: BABY_GIRLS, scale_id: MONTHS_SCALE_ID };
      const uiConfig = uiUtil.getUIState(GIRLS_DRESSES, dataConfig);
      expect(uiConfig.canAcceptOptions).to.be.true;
      expect(uiConfig.suggestedOptions).to.be.an('array').and.have.length(9);
      _.forEach(['Newborn', '0-3 Months', '6-9 Months'], (name) => {
        expect(_.find(uiConfig.suggestedOptions, {name: name})).to.exist;
      });
    });

    it('When suggested options are in the configuration, they\'re marked as selected in the uiConfig', () => {
      // using strings for valueId and id because it appears that's what the client gets from our server.
      const configuredOptions = [
        { id: '14592869', valueId: '1166197776', value: 'Orange', formattedValue: 'Orange', price: '20.00', isAvailable: true },
        { id: '14592868', valueId: '1166197772', value: 'Green', formattedValue: 'Green', price: '20.00', isAvailable: true},
        { id: '14592867', valueId: '1166197768', value: 'Blue', formattedValue: 'Blue', price: '20.00', isAvailable: true}
      ];
      const uiConfig = uiUtil.getUIState(CLIP_ART, { property_id: COLOR_PROPERTY, options: configuredOptions});
      expect(uiConfig.suggestedOptions).to.be.an('array').and.have.length(11);
      const configuredColors = ['Orange', 'Green', 'Blue'];
      _.forEach(uiConfig.suggestedOptions, (option) => {
        const expectedSelectedValue = _.includes(configuredColors, option.name);
        expect(option).to.have.property('selected', expectedSelectedValue);
      });
    });
  });

  describe('updateVariationInPair', () => {
    let reassignCustomPropertyIds;
    let requiresRecipient;
    let resolveValidRecipient;
    let resolveValidScale;
    let getRecipientEnumFromId;
    let pair;

    beforeEach(() => {
      pair = {
        recipient: 'boys',
        taxonomyId: 387,
        variations: [
          { first: true, propertyId: 100, options: [ { id: 1 }, { id: 2 } ] },
          { first: false, propertyId: 200, options: [ { id: 3 } ] }
        ]
      };

      reassignCustomPropertyIds = sinon.stub();
      requiresRecipient = sinon.stub();
      resolveValidRecipient = sinon.stub();
      resolveValidScale = sinon.stub();
      getRecipientEnumFromId = sinon.stub();

      uiUtil.__Rewire__('reassignCustomPropertyIds', reassignCustomPropertyIds);
      uiUtil.__Rewire__('requiresRecipient', requiresRecipient);
      uiUtil.__Rewire__('resolveValidRecipient', resolveValidRecipient);
      uiUtil.__Rewire__('resolveValidScale', resolveValidScale);
      uiUtil.__Rewire__('getRecipientEnumFromId', getRecipientEnumFromId);
    });

    afterEach(() => {
      uiUtil.__ResetDependency__('reassignCustomPropertyIds');
      uiUtil.__ResetDependency__('requiresRecipient');
      uiUtil.__ResetDependency__('resolveValidRecipient');
      uiUtil.__ResetDependency__('resolveValidScale');
      uiUtil.__ResetDependency__('getRecipientEnumFromId');
    });

    describe('delete variation', () => {
      it('should delete second variation', () => {
        requiresRecipient.returns(true);

        const expectedResult = {
          recipient: 'boys',
          taxonomyId: 387,
          variations: [ { first: true, propertyId: 100, options: [ { id: 1 }, { id: 2 } ] }]
        };

        const result = uiUtil.updateVariationInPair(pair, 1, null);
        expect(result).to.eql(expectedResult);
      });

      it('should delete first variation', () => {
        requiresRecipient.returns(true);

        const expectedResult = {
          recipient: 'boys',
          taxonomyId: 387,
          variations: [{ first: true, propertyId: 200, options: [ { id: 3  } ] }]
        };

        const result = uiUtil.updateVariationInPair(pair, 0, null);
        expect(result).to.eql(expectedResult);
      });

      //

      it('should delete variation and update custom property ID', () => {
        requiresRecipient.returns(true);

        uiUtil.updateVariationInPair(pair, 1, null);
        expect(reassignCustomPropertyIds).to.have.been.calledOnce;
      });

      it('should delete variation and keep recipient', () => {
        requiresRecipient.returns(true);

        const result = uiUtil.updateVariationInPair(pair, 1, null);
        expect(result.recipient).to.eql('boys');
      });

      it('should delete variation and clear recipient', () => {
        requiresRecipient.returns(false);

        const result = uiUtil.updateVariationInPair(pair, 1, null);
        expect(result.recipient).to.null;
      });
    });

    describe('update variation', () => {
      it('should update variation at given index', () => {
        requiresRecipient.returns(true);
        getRecipientEnumFromId.returns('girls');
        resolveValidScale.returns(234);

        const data = {
          recipientId: 123,
          variation: { first: false, propertyId: 300, options: [ { id: 4 } ] }
        };

        const expectedResult = {
          recipient: 'girls',
          taxonomyId: 387,
          variations: [
            { first: true, propertyId: 100, options: [ { id: 1 }, { id: 2 } ] },
            { first: false, propertyId: 300, options: [ { id: 4 } ], scalingOptionId: 234 }]
        };

        const result = uiUtil.updateVariationInPair(pair, 1, data);
        expect(result).to.eql(expectedResult);
      });

      it('should update set new recipient', () => {
        requiresRecipient.returns(true);
        getRecipientEnumFromId.returns('girls');
        resolveValidScale.returns(234);

        const data = {
          recipientId: 123,
          variation: { first: false, propertyId: 300, options: [ { id: 4 } ] }
        };

        const result = uiUtil.updateVariationInPair(pair, 1, data);
        expect(result.recipient).to.eql('girls');
      });

      it('should clear recipient', () => {
        requiresRecipient.returns(false);
        getRecipientEnumFromId.returns('girls');
        resolveValidScale.returns(234);

        const data = {
          recipientId: null,
          variation: { first: false, propertyId: 300, options: [ { id: 4 } ] }
        };

        const result = uiUtil.updateVariationInPair(pair, 1, data);
        expect(result.recipient).to.be.null;
      });

      it('should update custom property ID', () => {
        requiresRecipient.returns(true);
        getRecipientEnumFromId.returns('boys');
        resolveValidScale.returns(234);

        const data = {
          recipientId: null,
          variation: { first: false, propertyId: 300, options: [ { id: 4 } ] }
        };

        uiUtil.updateVariationInPair(pair, 1, data);
        expect(reassignCustomPropertyIds).to.have.been.calledOnce;
      });

      it('should set scaling option ID', () => {
        requiresRecipient.returns(true);
        getRecipientEnumFromId.returns('boys');
        resolveValidRecipient.returns(2345);
        resolveValidScale.returns(234);

        const data = {
          recipientId: null,
          variation: { first: false, propertyId: 300, options: [ { id: 4 } ] }
        };

        const result = uiUtil.updateVariationInPair(pair, 1, data);
        expect(result.variations[1].scalingOptionId).to.eql(234);
        expect(resolveValidRecipient).to.have.been.calledOnce;
        expect(resolveValidScale).to.have.been.calledOnce;
      });
    });
  });

  describe('reassignCustomPropertyIds', () => {
    let reassignCustomPropertyIds;

    beforeEach(() => {
      reassignCustomPropertyIds = uiUtil.__get__('reassignCustomPropertyIds');
    });

    it('should not touch property ID on variations', () => {
      const data = { variations: [{ propertyId: 200 }, { propertyId: 100 }] };

      reassignCustomPropertyIds(data);

      expect(data.variations).to.eql([ { propertyId: 200 }, { propertyId: 100 }]);
    });

    it('should set correct custom property ID on variation', () => {
      const data = { variations: [{ propertyId: 100 }, { propertyId: 514 }] };

      reassignCustomPropertyIds(data);

      expect(data.variations).to.eql([ { propertyId: 100 }, { propertyId: 513 }]);
    });

    it('should set correct custom property ID on both variations', () => {
      const data = { variations: [{ propertyId: 514 }, { propertyId: 514 }] };

      reassignCustomPropertyIds(data);

      expect(data.variations).to.eql([ { propertyId: 513 }, { propertyId: 514 }]);
    });
  });

  describe('insertOptions', () => {
    let suggestedOptions;
    let newOptions;

    beforeEach(() => {
      newOptions = [{ id: -1, value: 'Black' }];
      suggestedOptions = [
        { name: 'Black' },
        { name: 'Blue' },
        { name: 'Brown' },
        { name: 'Green' }
      ];
    });

    it('should add non sugested option to the end', () => {
      const options = [{ value: 'Pink' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(2);
      expect(result).to.eql([{ id: -1, value: 'Black' }, { id: -2, value: 'Pink' }]);
    });

    it('should add sugested option to the end if already adeed options are before new one', () => {
      const options = [{ value: 'Brown' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(2);
      expect(result).to.eql([{ id: -1, value: 'Black' }, { id: -2, value: 'Brown' }]);
    });

    it('should add sugested option before added options', () => {
      newOptions = [{ id: -1, value: 'Blue' }];
      const options = [{ value: 'Black' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(2);
      expect(result).to.eql([{ id: -2, value: 'Black' }, { id: -1, value: 'Blue' }]);
    });

    it('should add sugested option before closest adeed options', () => {
      newOptions = [{ id: -1, value: 'Green' }, { id: -2, value: 'Brown' }];
      const options = [{ value: 'Black' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(3);
      expect(result).to.eql([{ id: -1, value: 'Green' }, { id: -3, value: 'Black' }, { id: -2, value: 'Brown' }]);
    });

    it('should not add already added option', () => {
      newOptions = [{ id: -1, value: 'Black' }];
      const options = [{ value: 'Black' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(1);
      expect(result).to.eql([{ id: -1, value: 'Black' }]);
    });

    it('should add multiple options', () => {
      newOptions = [{ id: -1, value: 'Blue' }, { id: -2, value: 'Green' }];
      const options = [{ value: 'Black' }, { value: 'Brown' }, { value: 'Pink' }];
      const result = uiUtil.insertOptions(options, newOptions, suggestedOptions);

      expect(result.length).to.eql(5);
      expect(result).to.eql([{ id: -3, value: 'Black' }, { id: -1, value: 'Blue' }, { id: -4, value: 'Brown' }, { id: -2, value: 'Green' }, { id: -5, value: 'Pink' }]);
    });
  });
});
