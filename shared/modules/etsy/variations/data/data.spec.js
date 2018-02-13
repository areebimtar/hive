import {taxonomy, properties, propertySets, qualifierOptions } from './index';

import {expect} from 'chai';

describe('variation data helpers', () => {
  describe('taxonomy', () => {
    it('can resolve the category ID from the taxonomy', () => {
      expect(taxonomy.getCategoryId(2)).to.equal(68892144);
    });

    it('returns null for unknown taxonomy IDs', ()=> {
      expect(taxonomy.getCategoryId(999999999)).to.be.null;
    });
  });

  describe('properties', () => {
    it('Exports friendly named constants', () => {
      expect(properties.WIDTH.name).to.equal('Width');
      expect(properties.STYLE.name).to.equal('Style');
    });
  });

  describe('propertySets', () => {
    // taxonomies
    const GIRLS_CLOTHING_TAXONOMY_ID = 401;
    const GIRLS_DRESSES = 419;
    const WANDS = 14;

    // properties
    const SIZE_PROPERTY = 100;
    const COLOR_PROPERTY = 200;
    const LENGTH_PROPERTY = 506;
    const WIDTH_PROPERTY = 512;

    // recipients
    const BABY_GIRLS = 266817083;
    const BABIES = 266817085;
    const MEN = 266817059;
    const GIRLS = 266817077;

    // scales
    const JP_GIRLS_SIZE_SCALE = 386;
    const LENGTH_INCHES_SCALE = 350;
    const WIDTH_INCHES_SCALE = 338;

    const compareAsStrings = (val1, val2) => {
      expect(String(val1)).to.equal(String(val2));
    };

    it('Resolves the appropriate scale qualifiers for properties', () => {
      const widthPropertyId = properties.WIDTH.property_id;
      expect(propertySets.getScaleQualifierParamName(widthPropertyId)).to.equal('width_scale');
      expect(propertySets.getScaleQualifierId(widthPropertyId)).to.equal(306);
      expect(propertySets.getScaleQualifierParamName(properties.COLOR.property_id)).to.be.null;
    });

    it('Can determine if a recipient qualifier is needed', () => {
      const WANDS_TAXONOMY_ID = 14;
      const MENS_SHIRTS_TAXONOMY_ID = 444;
      expect(propertySets.requiresRecipient(WANDS_TAXONOMY_ID, 100)).to.be.false;
      // mens shirts size should require a recipient
      expect(propertySets.requiresRecipient(MENS_SHIRTS_TAXONOMY_ID, 100)).to.be.true;
      // mens shirts color should not
      expect(propertySets.requiresRecipient(MENS_SHIRTS_TAXONOMY_ID, 200)).to.be.false;
      // nor should mens shirt weight (even though weight requires a scale)
      expect(propertySets.requiresRecipient(MENS_SHIRTS_TAXONOMY_ID, 511)).to.be.false;
    });

    it('Can de-alias a taxonomy ID', () => {
      const HATS_AND_CAPES = '25';
      const COWBOY_HATS = '29';
      compareAsStrings(propertySets.deAliasTaxonomyId(COWBOY_HATS), HATS_AND_CAPES);
      compareAsStrings(propertySets.deAliasTaxonomyId(HATS_AND_CAPES), HATS_AND_CAPES);
      compareAsStrings(propertySets.deAliasTaxonomyId('invalid'), 'invalid');
    });

    it('Can de-alias a recipient ID for a taxonomy', () => {
      compareAsStrings(propertySets.deAliasRecipientId(GIRLS_CLOTHING_TAXONOMY_ID, BABIES), BABIES);
      compareAsStrings(propertySets.deAliasRecipientId(GIRLS_CLOTHING_TAXONOMY_ID, BABY_GIRLS), BABIES);
    });

    it('Can de-alias a recipient ID for an aliased taxonomy', () => {
      compareAsStrings(propertySets.deAliasTaxonomyId(GIRLS_DRESSES), GIRLS_CLOTHING_TAXONOMY_ID);
      compareAsStrings(propertySets.deAliasRecipientId(GIRLS_DRESSES, BABY_GIRLS), BABIES);
    });

    it('Can resolve valid recipient ids', () => {
      expect(propertySets.resolveValidRecipient(GIRLS_DRESSES, SIZE_PROPERTY, BABY_GIRLS)).to.equal(BABY_GIRLS);
      expect(propertySets.resolveValidRecipient(GIRLS_DRESSES, SIZE_PROPERTY, BABIES)).to.equal(BABIES);
      expect(propertySets.resolveValidRecipient(GIRLS_DRESSES, null, BABIES)).to.be.null;
      expect(propertySets.resolveValidRecipient(GIRLS_DRESSES, COLOR_PROPERTY, BABIES)).to.be.null;
      expect(propertySets.resolveValidRecipient(null, SIZE_PROPERTY, BABIES)).to.be.null;
      expect(propertySets.resolveValidRecipient(GIRLS_DRESSES, SIZE_PROPERTY, MEN)).to.be.null;
      expect(propertySets.resolveValidRecipient(null, null, null)).to.be.null;
    });

    it('Can resolve valid scale ids for properties without recipients', () => {
      expect(propertySets.resolveValidScale(WANDS, LENGTH_PROPERTY, LENGTH_INCHES_SCALE)).to.equal(LENGTH_INCHES_SCALE);
      expect(propertySets.resolveValidScale(WANDS, WIDTH_PROPERTY, WIDTH_INCHES_SCALE)).to.equal(WIDTH_INCHES_SCALE);
      expect(propertySets.resolveValidScale(WANDS, WIDTH_PROPERTY, LENGTH_INCHES_SCALE)).to.be.null;
      expect(propertySets.resolveValidScale(WANDS, WIDTH_PROPERTY, WIDTH_INCHES_SCALE, GIRLS)).to.equal(WIDTH_INCHES_SCALE);
      expect(propertySets.resolveValidScale(null, WIDTH_PROPERTY, WIDTH_INCHES_SCALE)).to.be.null;
      expect(propertySets.resolveValidScale(WANDS, null,  WIDTH_INCHES_SCALE)).to.be.null;
      expect(propertySets.resolveValidScale(null, null, null)).to.be.null;
    });

    it('Can resolve valid scale ids on listings with recipients', () => {
      expect(propertySets.resolveValidScale(GIRLS_DRESSES, SIZE_PROPERTY, JP_GIRLS_SIZE_SCALE, GIRLS)).to.equal(JP_GIRLS_SIZE_SCALE);
      expect(propertySets.resolveValidScale(GIRLS_DRESSES, SIZE_PROPERTY, JP_GIRLS_SIZE_SCALE, MEN)).to.be.null;
      expect(propertySets.resolveValidScale(GIRLS_DRESSES, SIZE_PROPERTY, LENGTH_INCHES_SCALE, GIRLS)).to.be.null;
      expect(propertySets.resolveValidScale(GIRLS_DRESSES, JP_GIRLS_SIZE_SCALE, null, GIRLS)).to.be.null;
      expect(propertySets.resolveValidScale(GIRLS_DRESSES, null, null, null)).to.be.null;
    });
  });

  describe('qualifierOptions', () => {
    it('Can look up the recipient id from the etsy enum value', () => {
      expect(qualifierOptions.getRecipientIdFromEnum('pets')).to.equal(301959242);
      expect(qualifierOptions.getRecipientIdFromEnum('foo')).to.be.null;
    });

    it('Can look up the recipient id from the pretty name', () => {
      expect(qualifierOptions.getRecipientIdFromPrettyName('Unisex Adults')).to.equal(266817065);
      expect(qualifierOptions.getRecipientIdFromPrettyName('foo')).to.be.null;
    });

    it('Can look up the recipient enum from the recipientId', () => {
      expect(qualifierOptions.getRecipientEnumFromId(266817065)).to.equal('unisex_adults');
      expect(qualifierOptions.getRecipientEnumFromId(1)).to.be.null;
    });
  });
});
