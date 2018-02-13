import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import { FIELDS } from './constants';

chai.use(sinonChai);

import {
  convertProductToListing as productToListing,
  convertProductVariationsToListingVariations,
  convertProductOfferingsToListingInventory,
  resultsInEmptyListing
} from './productToListing';

const product = {
  listing_id: '123',
  title: 'Test title <>\'\'',
  shop_section_id: 111,
  description: 'Test description"&',
  materials: ['abc', 'def ffdf'],
  state: 'edit'
};

const allFieldsChanged = [
  'listing_id',
  'title',
  'section_id',
  'description',
  'price',
  'materials',
  'state'
];

describe('ETSY: productToListing', () => {
  it('should convert product to listing', () => {
    const listing = productToListing(product, allFieldsChanged);
    expect(listing[FIELDS.LISTING_ID]).to.be.equal(123);
    expect(listing[FIELDS.STATE]).to.be.equal('edit');
    expect(listing[FIELDS.TITLE]).to.be.equal('Test title <>\'\'');
    expect(listing[FIELDS.DESCRIPTION]).to.be.equal('Test description"&');
    expect(listing[FIELDS.MATERIALS]).to.be.deep.equal(['abc', 'def ffdf']);
    expect(listing[FIELDS.SHOP_SECTION_ID]).to.be.equal('111');
    expect(listing.not_expected_field).to.be.undefined;
  });

  it('should properly handle price in float format and listing id in numeric format', () => {
    const listing = productToListing({
      listing_id: 11,
      state: 'draft',
      price: 123.23
    }, ['price']);

    expect(listing[FIELDS.LISTING_ID]).to.be.equal(11);
  });

  it('should properly handle null shop_section_id', () => {
    const listing = productToListing({
      listing_id: 11,
      state: 'draft',
      shop_section_id: null
    }, ['section_id']);

    expect(listing[FIELDS.SHOP_SECTION_ID]).to.be.null;
  });

  it('should not encode UTF characters with entities', () => {
    const title = 'République française';
    const listing = productToListing({
      listing_id: 11,
      state: 'draft',
      title: title
    }, ['title']);

    expect(listing.title).to.be.eql(title);
  });

  it('should not transfer fields which were not changed', () => {
    const title = 'République française';
    const description = 'Description';
    const listing = productToListing({
      listing_id: 11,
      state: 'draft',
      title: title,
      description: description
    }, ['description']);

    expect(listing.title).to.be.undefined;
    expect(listing.description).to.be.eql(description);
  });
});


describe('convertProductVariationsToListingVariations', () => {
  it('should still send prices to etsy when thee prices are all the same', () => {
    const LENGTH_PROP_ID = '506';
    const SIZE_PROP_ID = '100';
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: LENGTH_PROP_ID, formatted_name: 'Size', scaling_option_id: 301,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B cm', price: 42, is_available: true },
        { id: 71, variation_id: 12, value_id: 5428984828, value: '123', formatted_value: '123 cm', price: 42, is_available: false }
      ]
    }, {
      id: 13, product_id: 16, first: false, property_id: SIZE_PROP_ID, formatted_name: 'Size', scaling_option_id: 314,
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', price: 300, is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({recipient: 'not_specified', taxonomy_id: 502}, dbValue);

    expect(result).to.be.deep.equal({
      variations: [
        { property_id: LENGTH_PROP_ID, value: 'B', is_available: true, price: 42 },
        { property_id: LENGTH_PROP_ID, value: '123', is_available: false, price: 42},
        { property_id: SIZE_PROP_ID, value: 'XS', is_available: true, price: 300 }
      ],
      length_scale: 301,
      sizing_scale: 314,
      recipient_id: 302326609
    });
  });

  it('should send the product level price to etsy on variations even if no prices are present on the variations themselves', () => {
    const LENGTH_PROP_ID = '506';
    const SIZE_PROP_ID = '100';
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: LENGTH_PROP_ID, formatted_name: 'Size', scaling_option_id: 301,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B cm', is_available: true },
        { id: 71, variation_id: 12, value_id: 5428984828, value: '123', formatted_value: '123 cm', is_available: false }
      ]
    }, {
      id: 13, product_id: 16, first: false, property_id: SIZE_PROP_ID, formatted_name: 'Size', scaling_option_id: 314,
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({recipient: 'not_specified', taxonomy_id: 502, price: 12.34}, dbValue);

    expect(result).to.be.deep.equal({
      variations: [
        { property_id: LENGTH_PROP_ID, value: 'B', is_available: true, price: 12.34 },
        { property_id: LENGTH_PROP_ID, value: '123', is_available: false, price: 12.34},
        { property_id: SIZE_PROP_ID, value: 'XS', is_available: true, price: 12.34 }
      ],
      length_scale: 301,
      sizing_scale: 314,
      recipient_id: 302326609
    });
  });

  it('should convert variation from db into list of options when there is a pricing difference', () => {
    const LENGTH_PROP_ID = '506';
    const SIZE_PROP_ID = '100';
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: LENGTH_PROP_ID, formatted_name: 'Size', scaling_option_id: 301,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B cm', price: 43, is_available: true },
        { id: 71, variation_id: 12, value_id: 5428984828, value: '123', formatted_value: '123 cm', price: 42, is_available: false }
      ]
    }, {
      id: 13, product_id: 16, first: false, property_id: SIZE_PROP_ID, formatted_name: 'Size', scaling_option_id: 314,
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', price: 300, is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({recipient: 'not_specified', taxonomy_id: 502}, dbValue);

    expect(result).to.be.deep.equal({
      variations: [
        { property_id: LENGTH_PROP_ID, value: 'B', is_available: true, price: 43 },
        { property_id: LENGTH_PROP_ID, value: '123', is_available: false, price: 42},
        { property_id: SIZE_PROP_ID, value: 'XS', is_available: true, price: 300}
      ],
      length_scale: 301,
      sizing_scale: 314,
      recipient_id: 302326609
    });
  });

  it('should keep variations in the correct order', () => {
    const LENGTH_PROP_ID = '506';
    const SIZE_PROP_ID = '100';
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: LENGTH_PROP_ID, formatted_name: 'Size', scaling_option_id: 301,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B cm', price: 43, is_available: true },
        { id: 71, variation_id: 12, value_id: 5428984828, value: '123', formatted_value: '123 cm', price: 42, is_available: false }
      ]
    }, {
      id: 13, product_id: 16, first: false, property_id: SIZE_PROP_ID, formatted_name: 'Size', scaling_option_id: 314,
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', price: 300, is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({recipient: 'not_specified', taxonomy_id: 502}, dbValue);

    expect(result.variations[0]).to.have.property('property_id', LENGTH_PROP_ID);
    expect(result.variations[2]).to.have.property('property_id', SIZE_PROP_ID);

    // now switch the order
    const dbValue2 = [{
      id: 12, product_id: 16, first: false, property_id: LENGTH_PROP_ID, formatted_name: 'Size', scaling_option_id: 301,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B cm', price: 43, is_available: true },
        { id: 71, variation_id: 12, value_id: 5428984828, value: '123', formatted_value: '123 cm', price: 42, is_available: false }
      ]
    }, {
      id: 13, product_id: 16, first: true, property_id: SIZE_PROP_ID, formatted_name: 'Size', scaling_option_id: 314,
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', price: 300, is_available: true }]
    }];

    const result2 = convertProductVariationsToListingVariations({recipient: 'not_specified', taxonomy_id: 502}, dbValue2);
    expect(result2.variations[0]).to.have.property('property_id', SIZE_PROP_ID);
    expect(result2.variations[2]).to.have.property('property_id', LENGTH_PROP_ID);
  });

  it('should order the options by sequence', () => {
    const COLOR = 200;
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: COLOR, formatted_name: 'Color',
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'Third', formatted_value: 'Third cm', is_available: true, sequence: 3, price: 4 },
        { id: 71, variation_id: 12, value_id: 5428984828, value: 'First', formatted_value: 'First cm', is_available: true, sequence: 1, price: 4 },
        { id: 72, variation_id: 12, value_id: 5428984826, value: 'Second', formatted_value: 'Second cm', is_available: true, sequence: 2, price: 4 }
      ]
    }];

    const result = convertProductVariationsToListingVariations({}, dbValue);
    expect(result).to.deep.equal({
      variations: [
        { property_id: COLOR, value: 'First', is_available: true, price: 4 },
        { property_id: COLOR, value: 'Second', is_available: true, price: 4 },
        { property_id: COLOR, value: 'Third', is_available: true, price: 4 }
      ]
    });
  });

  it('should add name mapping for custom properties', () => {
    const CUST1_PROP_ID = '513';
    const CUST2_PROP_ID = '514';
    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: CUST1_PROP_ID, formatted_name: 'My length',
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: 'B', formatted_value: 'B', price: 42, is_available: true }
      ]
    }, {
      id: 13, product_id: 16, first: false, property_id: CUST2_PROP_ID, formatted_name: 'My size',
      options: [
        { id: 76, variation_id: 13, value_id: 1166388106, value: 'XS', formatted_value: 'XS - Teen Boys', price: 300, is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({}, dbValue);

    expect(result).to.be.deep.equal({
      variations: [
        { property_id: CUST1_PROP_ID, value: 'B', is_available: true, price: 42 },
        { property_id: CUST2_PROP_ID, value: 'XS', is_available: true, price: 300 }
      ],
      custom_property_names: {[CUST1_PROP_ID]: 'My length', [CUST2_PROP_ID]: 'My size'}
    });
  });

  it('should NOT escape characters for custom property names and option values', () => {
    const CUST_PROP_ID = '513';
    const dbString = 'M"y" sill\'y <> st';


    const dbValue = [{
      id: 12, product_id: 16, first: true, property_id: CUST_PROP_ID, formatted_name: dbString,
      options: [
        { id: 70, variation_id: 12, value_id: 5428984829, value: dbString, price: 42, is_available: true },
        { id: 76, variation_id: 13, value_id: 1166388106, value: dbString + '2', price: 42, is_available: true }]
    }];

    const result = convertProductVariationsToListingVariations({}, dbValue);

    expect(result).to.be.deep.equal({
      variations: [
        { property_id: CUST_PROP_ID, value: dbString, is_available: true, price: 42 },
        { property_id: CUST_PROP_ID, value: dbString + '2', is_available: true, price: 42 }
      ],
      custom_property_names: {[CUST_PROP_ID]: dbString }
    });
  });

  it('should convert productOfferings to listing inventory', () => {
    const listingId = 101;
    const productOfferings = [[{
      price: '101.00',
      sku: 'SKU',
      quantity: 20,
      visibility: true,
      valueId: '1213',
      value: 'Beige',
      formattedName: 'Color',
      propertyId: '200',
      scalingOptionId: null,
      influencesPrice: true,
      influencesQuantity: true,
      influencesSku: false
    }, {
      price: '101.00',
      sku: 'SKU',
      quantity: 20,
      visibility: true,
      valueId: '1166388104',
      value: 'XXS',
      formattedName: 'Size',
      propertyId: '100',
      scalingOptionId: '301',
      influencesPrice: true,
      influencesQuantity: true,
      influencesSku: false
    }]];

    const result = convertProductOfferingsToListingInventory(listingId, productOfferings);

    expect(result).to.be.deep.equal({
      listing_id: listingId,
      products: JSON.stringify([{
        sku: 'SKU',
        property_values: [{
          property_id: 200,
          property_name: 'Color',
          scale_id: null,
          value_id: 1213,
          value: 'Beige'
        }, {
          property_id: 100,
          property_name: 'Size',
          scale_id: 301,
          value_id: 1166388104,
          value: 'XXS'
        }],
        offerings: [{
          price: 101,
          quantity: 20,
          is_enabled: 1
        }]
      }]),
      price_on_property: [200, 100],
      quantity_on_property: [200, 100],
      sku_on_property: []
    });
  });

  it('should convert a productOffering for a listing with no variations to listing inventory with no product properties', () => {
    const listingId = 101;
    const productOfferings = [[{
      price: '101.00',
      sku: 'SKU',
      quantity: 20,
      visibility: true,
      valueId: null,
      value: null,
      formattedName: null,
      propertyId: null,
      scalingOptionId: null,
      influencesPrice: null,
      influencesQuantity: null,
      influencesSku: null
    }]];

    const result = convertProductOfferingsToListingInventory(listingId, productOfferings);

    expect(result).to.be.deep.equal({
      listing_id: listingId,
      products: JSON.stringify([{
        sku: 'SKU',
        property_values: [],
        offerings: [{
          price: 101,
          quantity: 20,
          is_enabled: 1
        }]
      }]),
      price_on_property: [],
      quantity_on_property: [],
      sku_on_property: []
    });
  });

  it('should convert productOfferings with 2 options to listing inventory', () => {
    const listingId = 101;
    const productOfferings = [
      [{
        id: '2819',
        price: '11.00',
        sku: null,
        quantity: 10,
        visibility: true,
        valueId: '1213',
        value: 'Beige',
        formattedName: 'Color',
        propertyId: '200',
        scalingOptionId: null,
        influencesPrice: true,
        influencesQuantity: false,
        influencesSku: false
      }, {
        id: '2819',
        price: '11.00',
        sku: null,
        quantity: 10,
        visibility: true,
        valueId: '1166388104',
        value: 'XXS',
        formattedName: 'Size',
        propertyId: '100',
        scalingOptionId: '301',
        influencesPrice: true,
        influencesQuantity: true,
        influencesSku: false
      }],
      [{
        id: '2820',
        price: '12.00',
        sku: null,
        quantity: 20,
        visibility: true,
        valueId: '1213',
        value: 'Beige',
        formattedName: 'Color',
        propertyId: '200',
        scalingOptionId: null,
        influencesPrice: true,
        influencesQuantity: false,
        influencesSku: false
      }, {
        id: '2820',
        price: '12.00',
        sku: null,
        quantity: 20,
        visibility: true,
        valueId: '1166388106',
        value: 'XS',
        formattedName: 'Size',
        propertyId: '100',
        scalingOptionId: '301',
        influencesPrice: true,
        influencesQuantity: true,
        influencesSku: false
      }],
      [{
        id: '2821',
        price: '13.00',
        sku: null,
        quantity: 30,
        visibility: true,
        valueId: '1',
        value: 'Black',
        formattedName: 'Color',
        propertyId: '200',
        scalingOptionId: null,
        influencesPrice: true,
        influencesQuantity: false,
        influencesSku: false
      }, {
        id: '2821',
        price: '13.00',
        sku: null,
        quantity: 30,
        visibility: true,
        valueId: '1166388104',
        value: 'XXS',
        formattedName: 'Size',
        propertyId: '100',
        scalingOptionId: '301',
        influencesPrice: true,
        influencesQuantity: true,
        influencesSku: false
      }],
      [{
        id: '2822',
        price: '14.00',
        sku: null,
        quantity: 40,
        visibility: true,
        valueId: '1',
        value: 'Black',
        formattedName: 'Color',
        propertyId: '200',
        scalingOptionId: null,
        influencesPrice: true,
        influencesQuantity: false,
        influencesSku: false
      }, {
        id: '2822',
        price: '14.00',
        sku: null,
        quantity: 40,
        visibility: true,
        valueId: '1166388106',
        value: 'XS',
        formattedName: 'Size',
        propertyId: '100',
        scalingOptionId: '301',
        influencesPrice: true,
        influencesQuantity: true,
        influencesSku: false
      }]
    ];

    const result = convertProductOfferingsToListingInventory(listingId, productOfferings);

    expect(result).to.be.deep.equal({
      listing_id: listingId,
      products: JSON.stringify([{
        sku: '',
        property_values: [{
          property_id: 200,
          property_name: 'Color',
          scale_id: null,
          value_id: 1213,
          value: 'Beige'
        }, {
          property_id: 100,
          property_name: 'Size',
          scale_id: 301,
          value_id: 1166388104,
          value: 'XXS'
        }],
        offerings: [{
          price: 11,
          quantity: 10,
          is_enabled: 1
        }]
      }, {
        sku: '',
        property_values: [{
          property_id: 200,
          property_name: 'Color',
          scale_id: null,
          value_id: 1213,
          value: 'Beige'
        }, {
          property_id: 100,
          property_name: 'Size',
          scale_id: 301,
          value_id: 1166388106,
          value: 'XS'
        }],
        offerings: [{
          price: 12,
          quantity: 20,
          is_enabled: 1
        }]
      }, {
        sku: '',
        property_values: [{
          property_id: 200,
          property_name: 'Color',
          scale_id: null,
          value_id: 1,
          value: 'Black'
        }, {
          property_id: 100,
          property_name: 'Size',
          scale_id: 301,
          value_id: 1166388104,
          value: 'XXS'
        }],
        offerings: [{
          price: 13,
          quantity: 30,
          is_enabled: 1
        }]
      }, {
        sku: '',
        property_values: [{
          property_id: 200,
          property_name: 'Color',
          scale_id: null,
          value_id: 1,
          value: 'Black'
        }, {
          property_id: 100,
          property_name: 'Size',
          scale_id: 301,
          value_id: 1166388106,
          value: 'XS'
        }],
        offerings: [{
          price: 14,
          quantity: 40,
          is_enabled: 1
        }]
      }]),
      price_on_property: [200, 100],
      quantity_on_property: [100],
      sku_on_property: []
    });
  });
});

describe('resultsInEmptyListing', () => {
  it('should result in empty listing', () => {
    const result = resultsInEmptyListing(['variations', '_modifiedByHive']);
    expect(result).to.be.true;
  });
  it('should not result in empty listing', () => {
    const result = resultsInEmptyListing([FIELDS.LISTING_ID, FIELDS.TITLE, '_modifiedByHive']);
    expect(result).to.be.false;
  });
});
