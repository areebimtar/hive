import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { createDbHelper } from '../../../test/util';
import { FIELDS } from '../../modules/etsy/constants';
import moment from 'moment';

const dbHelper = createDbHelper();

describe('Adding a product into products and product_properties', () => {
  let models;
  let shopId;
  let accountId;
  let storedProductId;
  const listingId = '12345';

  before(async function before() {
    models = dbHelper.getModels();
    accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe'}));
    const db = dbHelper.getDb();
    // reset sequences
    await db.none('ALTER SEQUENCE product_id_seq RESTART WITH 1;');
    await db.none('ALTER SEQUENCE product_properties_id_seq RESTART WITH 1;');
  });

  after(async function after() {
    await models.accounts.deleteById(accountId);
  });

  it('adding a product should return correct productId', async function test() {
    const product = {
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: 123,
      [FIELDS.STATE]: 'draft'
    };
    const id = await models.products.insert(product);
    storedProductId = id;
    expect(id).to.be.eql('1');
  });

  it('adding a product should return a new productId', async function test() {
    // product with fields that go to both, product_properties and products tables
    const product = {
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: 345,
      [FIELDS.STATE]: 'draft',
      [FIELDS.TITLE]: 'Test product B',
      [FIELDS.DESCRIPTION]: 'Test description B'
    };
    const id = await models.products.insert(product);
    expect(id).not.to.be.eql(storedProductId);
  });

  it.skip('Updates an existing product if the same shopId/listingId is used', async function test() {
    const shops = await models.shops.getByCompanyId(123);
    expect(shops[0]).to.have.property('id', shopId);
    const product = {
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: 456,
      [FIELDS.STATE]: 'active',
      [FIELDS.TITLE]: 'I am a listing',
      [FIELDS.HIVE_LAST_MODIFIED_TSZ]: moment().toISOString()
    };

    const productId = await models.products.insert(product);
    let retrievedProduct = await models.products.getById(shopId, productId);
    expect(retrievedProduct.title).to.eql('I am a listing');

    // modify the title in fields
    const newProduct = {
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: listingId,
      [FIELDS.STATE]: 'active',
      [FIELDS.TITLE]: 'I am a new listing',
      [FIELDS.HIVE_LAST_MODIFIED_TSZ]: moment().toISOString()
    };
    const result = await models.products.insert(newProduct);
    expect(result).to.eql(productId);
    retrievedProduct = await models.products.getById(shopId, productId);
    expect(retrievedProduct.title).to.eql('I am a new listing');
  });
});
