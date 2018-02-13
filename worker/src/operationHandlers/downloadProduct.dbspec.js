import _ from 'lodash';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
import { FIELDS } from '../../../shared/modules/etsy/constants';
import { createDbHelper, opHandlers } from '../../../test/util';
import * as etsyApiResponses from '../../../test/fixtures/etsyApiResponses';
import sections from '../../../test/fixtures/shopSectionsResponse.json';

const dbHelper = createDbHelper();

const SECTION_NAME = _.get(sections, 'results.0.title');
const LISTING_ID = '502980700';

describe('downloadProduct', () => {
  let models;
  let shop;
  let account;
  let productId;
  let handler;
  let rawDb;

  before(async function beforeEach() {
    models = dbHelper.getModels();
    const accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    account = await models.accounts.getById(accountId);
    const shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe'}));
    shop = await models.shops.getById(shopId);
    const insertedSection = await models.sections.insert(shopId, [{ name: SECTION_NAME }]);
    const sectionId = _.get(insertedSection, SECTION_NAME);
    productId = String(await models.products.insert({
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: LISTING_ID,
      [FIELDS.STATE]: 'draft',
      [FIELDS.SECTION_ID]: sectionId
    }));

    handler = opHandlers.downloadProduct;
    rawDb = dbHelper.getDb();
  });

  after(async function beforeEach() {
    await rawDb.any(`SELECT deleteshop(${shop.id});`);
    await models.accounts.deleteById(account.id);
  });

  beforeEach(async () => {
    await rawDb.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');
  });
  // set up a sandbox for easy cleanup of any stubs/spies we create
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    sandbox.restore();
  });

  it('download product', async function test() {
    etsyApiResponses.setupDownloadListing(LISTING_ID);
    const result = await handler.start(null, models, null, productId, shop, account, null, null);
    expect(result).to.have.property('result', 'succeeded');
  });

  it('insert attributes', async function test() {
    const expected = [
      { id: '1', product_id: productId, property_id: '46803063641', scale_id: null, value_ids: ['16'], modified: false, deleted: false },
      { id: '2', product_id: productId, property_id: '46803063659', scale_id: null, value_ids: ['33'], modified: false, deleted: false }
    ];
    etsyApiResponses.setupDownloadListing(LISTING_ID);
    const result = await handler.start(null, models, null, productId, shop, account, null, null);
    expect(result).to.have.property('result', 'succeeded');

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(2);
    expect(attributes).to.eql(expected);
  });

  it('update attributes', async function test() {
    const expected = [
      { id: '1', product_id: productId, property_id: '46803063641', scale_id: null, value_ids: ['16'], modified: false, deleted: false },
      { id: '2', product_id: productId, property_id: '46803063659', scale_id: null, value_ids: ['33'], modified: false, deleted: false }
    ];
    await models.attributes.upsertAttributes(productId, [
      { productId, propertyId: 46803063641, scaleId: null, valueIds: [111] },
      { productId, propertyId: 46803063659, scaleId: null, valueIds: [222] }
    ]);

    etsyApiResponses.setupDownloadListing(LISTING_ID);
    const result = await handler.start(null, models, null, productId, shop, account, null, null);
    expect(result).to.have.property('result', 'succeeded');

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(2);
    expect(attributes).to.eql(expected);
  });

  it('delete old attributes', async function test() {
    const expected = [
      { id: '3', product_id: productId, property_id: '46803063641', scale_id: null, value_ids: ['16'], modified: false, deleted: false },
      { id: '4', product_id: productId, property_id: '46803063659', scale_id: null, value_ids: ['33'], modified: false, deleted: false }
    ];
    await models.attributes.upsertAttributes(productId, [
      { productId, propertyId: 123, scaleId: null, valueIds: [111] },
      { productId, propertyId: 234, scaleId: null, valueIds: [222] }
    ]);

    etsyApiResponses.setupDownloadListing(LISTING_ID);
    const result = await handler.start(null, models, null, productId, shop, account, null, null);
    expect(result).to.have.property('result', 'succeeded');

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(2);
    expect(attributes).to.eql(expected);
  });
});
