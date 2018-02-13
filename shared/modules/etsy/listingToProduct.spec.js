import _ from 'lodash';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { FIELDS } from './constants';

import module, {convertListingToProduct as listingToProduct, getVariations} from './listingToProduct';

chai.use(sinonChai);

const inventory = [{
  products: [{
    product_id: 47166738,
    sku: '',
    property_values: [
      { property_id: 200, property_name: 'Color', scale_id: null, scale_name: null, value_ids: [ 2 ], values: [ 'Blue' ]},
      { property_id: 100, property_name: 'Size', scale_id: null, scale_name: null, value_ids: [ 1166388122 ], values: [ 'L' ] }
    ],
    offerings: [
      { offering_id: 47723882, price: { amount: 6600, divisor: 100 }, quantity: 16, is_enabled: 1 }
    ]
  }, {
    product_id: 47166739,
    sku: '',
    property_values: [
      { property_id: 200, property_name: 'Color', scale_id: null, scale_name: null, value_ids: [ 4 ], values: [ 'Green' ]},
      { property_id: 100, property_name: 'Size', scale_id: null, scale_name: null, value_ids: [ 1166388122 ], values: [ 'L' ] }
    ],
    offerings: [
      { offering_id: 47723883, price: { amount: 6700, divisor: 100 }, quantity: 16, is_enabled: 0 }
    ]
  }],
  price_on_property: [ 200 ],
  quantity_on_property: [],
  sku_on_property: []
}];

const listing = {
  listing_id: 1111155555,
  taxonomy_id: 449, // mens T-shirts
  User: 'should be removed',
  Shop: 'should be removed',
  Section: 'should be removed',
  Images: 'should be removed',
  MainImage: {url_75x75: 'url75x75'}, // Should be transferred to thumbnailUrl
  Translations: [ {language: 'en-US', title: 'should be removed'}, {language: 'ru-RU', title: 'RuTitle'}],
  Manufacturers: 'should be removed',
  Inventory: inventory,
  price: '123.3',
  tags: ['tag1', 'tag2'], // Should be converted to separate properties
  materials: ['material1', null, 'material2'], // Should be converted to separate properties
  style: ['null', 'style2'], // Should be converted to separate properties
  taxonomy_path: [123, 45, 6],
  title: 'Test title &lt;&gt;&#39;',
  description: 'Test description&quot;&amp;',
  who_made: 'i_did',
  when_made: '2010_2016', // Should be converted to '2010_2017'
  recipient: 'hommes', // Should be converted to 'men'
  occasion: null, // Should be possible
  state: 'edit' // will make product invalid
};

const titleDecoded = 'Test title <>\'';
const descriptionDecoded = 'Test description"&';
let logger = {};

describe('ETSY: listingToProduct', () => {
  beforeEach(() => {
    logger = {
      info: sinon.spy(),
      error: sinon.spy(),
      debug: sinon.spy()
    };
  });
  it('should convert listing to product', () => {
    const product = listingToProduct(logger, listing);

    // Check that associations won't transferred to product
    expect(product.User).to.be.undefined;
    expect(product.Shop).to.be.undefined;
    expect(product.Section).to.be.undefined;
    expect(product.Images).to.be.undefined;
    expect(product.MainImage).to.be.undefined;
    expect(product.Translations).to.be.undefined;
    expect(product.Manufacturers).to.be.undefined;
    expect(product.Inventory).to.be.undefined;

    // Check that encoded html entities in title and description were decoded
    expect(product[FIELDS.TITLE]).to.be.equal(titleDecoded);
    expect(product[FIELDS.DESCRIPTION]).to.be.equal(descriptionDecoded);

    expect(product[FIELDS.STATE]).to.be.equal('edit');

    // Check that normal properties were properly transferred to product
    expect(product[FIELDS.PRICE]).to.be.eql(123.3);

    expect(product[FIELDS.LISTING_ID]).to.be.equal(listing.listing_id);

    // Check that product is valid
    expect(product[FIELDS.IS_INVALID]).to.be.equal(true);

    expect(product[FIELDS.TAXONOMY_ID]).to.be.equal(listing.taxonomy_id);
  });

  it('should convert listing variations', () => {
    const product = listingToProduct(sinon.spy(), listing);
    const variations = product.variations;

    expect(variations).to.have.length(2);

    // Notice that in listing this variation is second but is marked
    // as first because it is priced
    const firstVariation = variations[0];
    expect(firstVariation).to.be.deep.equal({
      propertyId: 200,
      first: true,
      formattedName: 'Color',
      influencesPrice: true,
      influencesQuantity: false,
      influencesSku: false,
      scalingOptionId: null,
      options: [{
        valueId: 2,
        value: 'Blue'
      }, {
        valueId: 4,
        value: 'Green'
      }]
    });

    const secondVariation = variations[1];
    expect(secondVariation).to.be.deep.equal({
      propertyId: 100,
      first: false,
      formattedName: 'Size',
      influencesPrice: false,
      influencesQuantity: false,
      influencesSku: false,
      scalingOptionId: null,
      options: [{
        valueId: 1166388122,
        value: 'L'
      }]
    });
  });
  it('should convert listing with Inventory to product', () => {
    const product = listingToProduct(logger, _.merge(listing, { Inventory: inventory }), true);
    // check influences* are set from Inventory on variations
    expect(product.variations[0].influencesPrice).to.be.true;
    expect(product.variations[0].influencesQuantity).to.be.false;
    expect(product.variations[0].influencesSku).to.be.false;
    expect(product.variations[1].influencesPrice).to.be.false;
    expect(product.variations[1].influencesQuantity).to.be.false;
    expect(product.variations[1].influencesSku).to.be.false;
    expect(product.productOfferings).to.have.length(2);
    expect(product.productOfferings[0]).to.be.deep.equal({
      price: 66,
      quantity: 16,
      sku: '',
      visibility: true,
      valueIds: [ 2, 1166388122 ],
      values: [ 'Blue', 'L' ]
    });
    expect(product.productOfferings[1]).to.be.deep.equal({
      price: 67,
      quantity: 16,
      sku: '',
      visibility: false,
      valueIds: [ 4, 1166388122 ],
      values: [ 'Green', 'L' ]
    });
  });
});

describe('ETSY: getVariations', () => {
  beforeEach(() => {
    logger = {
      info: sinon.spy(),
      error: sinon.spy(),
      debug: sinon.spy()
    };
  });
  it('should decode option names of property names and option value in inventory', () => {
    const decodedCustomPropertyName = 'Gle\'e "p" y <>';
    const decodedOptionName = 'Ain\'t "it" < shame?';
    const etsyListing = { Inventory: [{
      price_on_property: [],
      quantity_on_property: [],
      sku_on_property: [],
      products: [
        {
          property_values: [{
            property_id: 513,
            property_name: 'Gle&#39;e &quot;p&quot; y &lt;&gt;',
            scale_id: null,
            scale_name: null,
            value_ids: [ 999999 ],
            values: [ 'Ain&#39;t &quot;it&quot; &lt; shame?' ]
          }]
        }]
    }]};
    const variations = getVariations(logger, etsyListing.Inventory);

    expect(variations).to.have.length(1);
    expect(variations[0]).to.have.property('formattedName', decodedCustomPropertyName);
    expect(variations[0].options).to.have.length(1);
    expect(variations[0].options[0]).to.eql({
      valueId: 999999,
      value: decodedOptionName
    });
  });

  it('should get variations from Inventory', () => {
    const etsyListing = { Inventory: [{
      price_on_property: [ 515 ],
      quantity_on_property: [],
      sku_on_property: [],
      products: [
        {
          property_values: [{
            property_id: 515,
            property_name: 'Device',
            scale_id: null,
            scale_name: null,
            value_ids: [ 5668983248 ],
            values: [ 'iPad' ]
          }, {
            property_id: 200,
            property_name: 'Color',
            scale_id: null,
            scale_name: null,
            value_ids: [ 1 ],
            values: [ 'Black' ]
          }]
        },
        {
          property_values: [{
            property_id: 515,
            property_name: 'Device',
            scale_id: null,
            scale_name: null,
            value_ids: [ 5668983248 ],
            values: [ 'iPad' ]
          }, {
            property_id: 200,
            property_name: 'Color',
            scale_id: null,
            scale_name: null,
            value_ids: [ 2 ],
            values: [ 'Blue' ]
          }]
        },
        {
          property_values: [{
            property_id: 515,
            property_name: 'Device',
            scale_id: null,
            scale_name: null,
            value_ids: [ 5668983250 ],
            values: [ 'iPad Mini' ]
          }, {
            property_id: 200,
            property_name: 'Color',
            scale_id: null,
            scale_name: null,
            value_ids: [ 1 ],
            values: [ 'Black' ]
          }]
        },
        {
          property_values: [{
            property_id: 515,
            property_name: 'Device',
            scale_id: null,
            scale_name: null,
            value_ids: [ 5668983250 ],
            values: [ 'iPad Mini' ]
          }, {
            property_id: 200,
            property_name: 'Color',
            scale_id: null,
            scale_name: null,
            value_ids: [ 2 ],
            values: [ 'Blue' ]
          }]
        }]
    }]};
    const variations = getVariations(logger, etsyListing.Inventory);
    expect(variations).to.be.array;
    expect(variations.length).to.be.equal(2);
    expect(variations[0]).to.be.deep.equal({
      propertyId: 515,
      formattedName: 'Device',
      first: true,
      influencesPrice: true,
      influencesQuantity: false,
      influencesSku: false,
      scalingOptionId: null,
      options: [
        { valueId: 5668983248, value: 'iPad' },
        { valueId: 5668983250, value: 'iPad Mini' }
      ]
    });
    expect(variations[1]).to.be.deep.equal({
      propertyId: 200,
      formattedName: 'Color',
      first: false,
      influencesPrice: false,
      influencesQuantity: false,
      influencesSku: false,
      scalingOptionId: null,
      options: [
        { valueId: 1, value: 'Black' },
        { valueId: 2, value: 'Blue' }
      ]
    });
  });
});

describe('fixPropertyIdOrder', () => {
  let fixPropertyIdOrder;

  beforeEach(() => {
    fixPropertyIdOrder = module.__get__('fixPropertyIdOrder');
  });

  it('should fix incorrect properties order in Inventory', () => {
    const etsyListingProducts = [
      { property_values: [{ property_id: 515 }, { property_id: 200 }] },
      { property_values: [{ property_id: 200 }, { property_id: 515 }] },
      { property_values: [{ property_id: 515 }, { property_id: 200 }] },
      { property_values: [{ property_id: 200 }, { property_id: 515 }] }
    ];

    const expected = [
      { property_values: [{ property_id: 515 }, { property_id: 200 }] },
      { property_values: [{ property_id: 515 }, { property_id: 200 }] },
      { property_values: [{ property_id: 515 }, { property_id: 200 }] },
      { property_values: [{ property_id: 515 }, { property_id: 200 }] }
    ];

    return expect(fixPropertyIdOrder(etsyListingProducts)).to.eql(expected);
  });

  it('should swap custom properties order in Inventory', () => {
    const etsyListingProducts = [
      { property_values: [{ property_id: 514 }, { property_id: 513 }] },
      { property_values: [{ property_id: 513 }, { property_id: 514 }] },
      { property_values: [{ property_id: 514 }, { property_id: 513 }] },
      { property_values: [{ property_id: 513 }, { property_id: 514 }] }
    ];

    const expected = [
      { property_values: [{ property_id: 513 }, { property_id: 514 }] },
      { property_values: [{ property_id: 513 }, { property_id: 514 }] },
      { property_values: [{ property_id: 513 }, { property_id: 514 }] },
      { property_values: [{ property_id: 513 }, { property_id: 514 }] }
    ];

    return expect(fixPropertyIdOrder(etsyListingProducts)).to.eql(expected);
  });

  it('should throw if there are more than 2 properties', () => {
    const etsyListingProducts = [
      { property_values: [{ property_id: 1 }, { property_id: 2 }, { property_id: 3 }] },
      { property_values: [{ property_id: 2 }, { property_id: 3 }, { property_id: 1 }] },
      { property_values: [{ property_id: 1 }, { property_id: 2 }, { property_id: 3 }] },
      { property_values: [{ property_id: 2 }, { property_id: 1 }, { property_id: 3 }] }
    ];

    return expect(() => fixPropertyIdOrder(etsyListingProducts)).to.throw('Too many properties on etsy listing: 3');
  });
});
