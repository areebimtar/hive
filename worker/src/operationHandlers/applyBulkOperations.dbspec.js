import _ from 'lodash';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
import { FIELDS } from '../../../shared/modules/etsy/constants';
import { createDbHelper, noopLogger, deleteAllShops } from '../../../test/util';
import sections from '../../../test/fixtures/shopSectionsResponse.json';
import applyBulkOperations from './applyBulkOperations';


const dbHelper = createDbHelper();

const SECTION_NAME = _.get(sections, 'results.0.title');
const LISTING_ID = '502980700';

describe('applyBulkOperations', () => {
  let config;
  let models;
  let rabbitClient;
  let shop;
  let productId;
  let rawDb;

  beforeEach(async function beforeEach() {
    rawDb = dbHelper.getDb();

    await deleteAllShops(rawDb);

    models = dbHelper.getModels();
    const accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    const shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe'}));
    shop = await models.shops.getById(shopId);
    const insertedSection = await models.sections.insert(shopId, [{ name: SECTION_NAME }]);
    const sectionId = _.get(insertedSection, SECTION_NAME);

    productId = String(await models.products.insert({
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: LISTING_ID,
      [FIELDS.STATE]: 'draft',
      [FIELDS.SECTION_ID]: sectionId,
      [FIELDS.TAXONOMY_ID]: 12345,
      [FIELDS.CAN_WRITE_INVENTORY]: true
    }));
  });

  beforeEach(async () => {
    config = {};
    rabbitClient = { enqueueShopSync: sinon.stub() };
    await rawDb.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');
    await rawDb.none('ALTER SEQUENCE image_id_seq RESTART WITH 1;');
    await rawDb.none('ALTER SEQUENCE vela_images_id_seq RESTART WITH 1;');
  });
  // set up a sandbox for easy cleanup of any stubs/spies we create
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    sandbox.restore();
  });

  it('should add new attribute', async function test() {
    const ops = { shopId: shop.id, operations: [{ type: 'occasion.set', products: [productId], value: 15}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(1);
    expect(attributes).to.eql([
      { id: '1', product_id: String(productId), property_id: '46803063641', scale_id: null, value_ids: ['15'], modified: true, deleted: false }
    ]);
  });

  it('should update existing attribute', async function test() {
    await rawDb.any(`INSERT INTO attributes values(1, ${productId}, '46803063641', null, '{15}', false, false)`);

    const ops = { shopId: shop.id, operations: [{ type: 'occasion.set', products: [productId], value: 15}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(1);
    expect(attributes).to.eql([
      { id: '1', product_id: String(productId), property_id: '46803063641', scale_id: null, value_ids: ['15'], modified: true, deleted: false }
    ]);
  });

  it('should delete existing attribute', async function test() {
    await rawDb.any(`INSERT INTO attributes values(1, ${productId}, '46803063641', null, '{15}', false, false)`);

    const ops = { shopId: shop.id, operations: [{ type: 'occasion.set', products: [productId], value: -1}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const attributes = await rawDb.any(`SELECT * FROM attributes where product_id=${productId}`);
    expect(attributes.length).to.eql(1);
    expect(attributes).to.eql([
      { id: '1', product_id: String(productId), property_id: '46803063641', scale_id: null, value_ids: ['15'], modified: false, deleted: true }
    ]);
  });

  it('should save images', async () => {
    const ops = { shopId: shop.id, operations: [{ type: 'photos.add', products: [productId], value: [{ hash: '1234567890' }]}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const velaImages = await rawDb.any(`SELECT * FROM vela_images where hash='1234567890'`);
    expect(velaImages.length).to.eql(1);

    const images = await rawDb.any(`SELECT * FROM images where vela_image_id=${velaImages[0].id}`);
    expect(images.length).to.eql(1);

    const product = await rawDb.any(`SELECT * FROM product_properties where id=${productId}`);
    expect(product.length).to.eql(1);
    expect(product[0].photos).to.eql([String(images[0].id)]);
  });

  it('should reuse images', async () => {
    await rawDb.any(`INSERT INTO vela_images values(1, '1234567890', '')`);
    await rawDb.any(`INSERT INTO images values(1, 11, 'url', 'full_url', 1, ${shop.id})`);

    const ops = { shopId: shop.id, operations: [{ type: 'photos.add', products: [productId], value: [{ hash: '1234567890' }]}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const velaImages = await rawDb.any(`SELECT * FROM vela_images where hash='1234567890'`);
    expect(velaImages.length).to.eql(1);

    const images = await rawDb.any(`SELECT * FROM images`);
    expect(images.length).to.eql(1);

    const product = await rawDb.any(`SELECT * FROM product_properties where id=${productId}`);
    expect(product.length).to.eql(1);
    expect(product[0].photos).to.eql(['1']);
  });

  it('should reuse image for multiple new images', async () => {
    await rawDb.any(`INSERT INTO vela_images values(1, '1234567890', '')`);
    await rawDb.any(`INSERT INTO images (vela_image_id, shop_id) values(1, ${shop.id})`);

    const ops = { shopId: shop.id, operations: [{ type: 'photos.add', products: [productId], value: [{ hash: '1234567890' }, { hash: '1234567890' }, { hash: '1234567890' }, { hash: '1234567890' }]}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const velaImages = await rawDb.any(`SELECT * FROM vela_images where hash='1234567890'`);
    expect(velaImages.length).to.eql(1);

    const images = await rawDb.any(`SELECT * FROM images`);
    expect(images.length).to.eql(4);

    const product = await rawDb.any(`SELECT * FROM product_properties where id=${productId}`);
    expect(product.length).to.eql(1);
    expect(product[0].photos).to.eql(['1', '2', '3', '4']);
  });

  it('should add and reuse image for multiple new images', async () => {
    const ops = { shopId: shop.id, operations: [{ type: 'photos.add', products: [productId], value: [{ hash: '1234567890' }, { hash: '1234567890' }, { hash: '1234567890' }, { hash: '1234567890' }]}] };
    await applyBulkOperations(config, models, noopLogger, ops, rabbitClient);

    const velaImages = await rawDb.any(`SELECT * FROM vela_images where hash='1234567890'`);
    expect(velaImages.length).to.eql(1);

    const images = await rawDb.any(`SELECT * FROM images where vela_image_id=${velaImages[0].id}`);
    expect(images.length).to.eql(4);

    const product = await rawDb.any(`SELECT * FROM product_properties where id=${productId}`);
    expect(product.length).to.eql(1);
    expect(product[0].photos).to.eql(['1', '2', '3', '4']);
  });
});

