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
import ApiClient from '../../../shared/modules/etsy/apiClient';

const dbHelper = createDbHelper();

const SECTION_NAME = _.get(sections, 'results.0.title');
const LISTING_ID = '111';

describe('uploadProduct', () => {
  let models;
  let shopId;
  let accountId;
  let productId;

  before(async function beforeEach() {
    models = dbHelper.getModels();
    accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe'}));
  });

  after(async function beforeEach() {
    await models.accounts.deleteById(accountId);
  });

  afterEach(async function beforeEach() {
    const rawDb = dbHelper.getDb();
    await rawDb.any('DELETE FROM attributes;');
  });

  // set up a sandbox for easy cleanup of any stubs/spies we create
  const sandbox = sinon.sandbox.create();
  afterEach(() => {
    sandbox.restore();
  });

  const setChangedProperties = async (properties) =>
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CHANGED_PROPERTIES]: properties
    });

  it('create a product', async function test() {
    const insertedSection = await models.sections.insert(shopId, [{ name: SECTION_NAME }]);
    const sectionId = _.get(insertedSection, SECTION_NAME);
    productId = String(await models.products.insert({
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: LISTING_ID,
      [FIELDS.STATE]: 'draft',
      [FIELDS.SECTION_ID]: sectionId,
      [FIELDS.TITLE]: 'test title'
    }));

    const product = await models.products.getById(productId);
    expect(product).to.have.property('id').eql(productId);
  });

  it('uploads the product', async function test() {
    await setChangedProperties([FIELDS.TITLE]);

    etsyApiResponses.setupGetShopSections(shopId);
    etsyApiResponses.setupUploadListingSuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const photosResult = await handler.start(null, models, null, productId, null, null);
    expect(photosResult).to.have.property('result', 'suspended');
    expect(photosResult).to.have.property('suspensionPoint', 'uploadModifiedFields');
  });

  it('creates product offerings', async function test() {
    await models.productOfferings.addFromProductIdUsingInventory(productId, [{
      price: 10,
      quantity: 11,
      sku: '11e',
      visibility: true
    }]);
    const productOfferings = await models.productOfferings.getByProductIds(productId);
    const offering = _.head(productOfferings[productId]);
    expect(offering).to.have.property('price', '10.00');
    expect(offering).to.have.property('productId', productId);
    expect(offering).to.have.property('quantity', 11);
    expect(offering).to.have.property('sku', '11e');
    expect(offering).to.have.property('visibility', true);
  });

  it('uploads product offerings without uploading fields if no field changes', async function tests() {
    await setChangedProperties([FIELDS.PRODUCT_OFFERINGS]);

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, null);
    expect(result).to.have.property('suspensionPoint', 'uploadProductOfferings');
    expect(result).to.have.property('result', 'suspended');
  });

  it('does not upload product offerings if can_write_inventory flag is set to false', async function tests() {
    await setChangedProperties([FIELDS.PRODUCT_OFFERINGS]);
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CAN_WRITE_INVENTORY]: false
    });

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, null);
    expect(result).to.have.property('result', 'succeeded');
  });

  it('Updates both inventory and fields if both have changed', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      title: 'new title',
      [FIELDS.CAN_WRITE_INVENTORY]: true,
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.TITLE, FIELDS.PRODUCT_OFFERINGS]
    });

    const updateInventorySpy = sandbox.spy(ApiClient.prototype, 'updateListingInventory');
    const updateListingSpy = sandbox.spy(ApiClient.prototype, 'updateListing');
    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    etsyApiResponses.setupUploadListingSuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    let result = await handler.start(null, models, null, productId, null, null);
    expect(result).to.have.property('result', 'suspended');
    expect(result).to.have.property('suspensionPoint', 'uploadModifiedFields');

    await setChangedProperties([FIELDS.PRODUCT_OFFERINGS]);

    result = await handler.resume(null, models, null, productId, result.suspensionPoint, false, null, null);
    expect(result).to.have.property('suspensionPoint', 'uploadProductOfferings');
    expect(result).to.have.property('result', 'suspended');
    expect(updateInventorySpy).to.have.been.calledOnce;
    expect(updateListingSpy).to.have.been.calledOnce;
  });

  it('should not send "global" price to etsy', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      price: '123.00',
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.TITLE, FIELDS.PRICE]
    });

    const updateInventorySpy = sandbox.spy(ApiClient.prototype, 'updateListingInventory');
    const updateListingSpy = sandbox.spy(ApiClient.prototype, 'updateListing');
    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    etsyApiResponses.setupUploadListingSuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, null);
    expect(result).to.have.property('result', 'suspended');
    expect(result).to.have.property('suspensionPoint', 'uploadModifiedFields');
    expect(updateInventorySpy).to.not.have.been.called;
    expect(updateListingSpy).to.have.been.calledOnce;
    expect(updateListingSpy.args[0][0]).to.eql({ listing_id: parseInt(LISTING_ID, 10), title: 'new title', state: 'draft' });
  });

  it('should not send "global" quantity to etsy', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      quantity: '123',
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.TITLE, FIELDS.QUANTITY]
    });
    const updateInventorySpy = sandbox.spy(ApiClient.prototype, 'updateListingInventory');
    const updateListingSpy = sandbox.spy(ApiClient.prototype, 'updateListing');
    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    etsyApiResponses.setupUploadListingSuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, null);
    expect(result).to.have.property('result', 'suspended');
    expect(result).to.have.property('suspensionPoint', 'uploadModifiedFields');
    expect(updateInventorySpy).to.not.have.been.called;
    expect(updateListingSpy).to.have.been.calledOnce;
    expect(updateListingSpy.args[0][0]).to.eql({ listing_id: parseInt(LISTING_ID, 10), title: 'new title', state: 'draft' });
  });

  it('should skips attributes updates', async function tests() {
    await models.attributes.upsertAttribute(productId, {propertyId: 123, value_ids: [1], modified: false, deleted: false});

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, null);

    expect(result).to.have.property('result', 'succeeded');
  });

  it('should upload attribute updates', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CAN_WRITE_INVENTORY]: true,
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.ATTRIBUTES]
    });

    const manager = {
      enqueueAttributeUpdate: sinon.spy(),
      enqueueAttributeDelete: sinon.spy(),
      enqueueProductFieldsUpload: sinon.spy(),
      getSubtaskResults: sinon.stub().returns([{result: true}]),
      dropAllCompletedChildren: sinon.spy()
    };

    await models.attributes.upsertAttribute(productId, {propertyId: 123, value_ids: [1], modified: true, deleted: false});

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, manager);

    expect(result).to.have.property('result', 'suspended');
    expect(result).to.have.property('suspensionPoint', 'attributesUpdate');
    expect(manager.enqueueAttributeUpdate).to.have.been.calledOnce;
    expect(manager.enqueueAttributeDelete).to.not.have.been.called;
  });

  it('does not upload product attributes if can_write_inventory flag is set to false', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CAN_WRITE_INVENTORY]: false,
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.ATTRIBUTES]
    });

    const manager = {
      enqueueAttributeUpdate: sinon.spy(),
      enqueueAttributeDelete: sinon.spy(),
      enqueueProductFieldsUpload: sinon.spy(),
      getSubtaskResults: sinon.stub().returns([{result: true}]),
      dropAllCompletedChildren: sinon.spy()
    };

    await models.attributes.upsertAttribute(productId, {propertyId: 123, value_ids: [1], modified: true, deleted: false});

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, manager);

    expect(result).to.have.property('result', 'succeeded');
    expect(manager.enqueueAttributeUpdate).to.not.have.been.called;
    expect(manager.enqueueAttributeDelete).to.not.have.been.called;
  });

  it('should delete attribute', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CAN_WRITE_INVENTORY]: true,
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.ATTRIBUTES]
    });

    const manager = {
      enqueueAttributeUpdate: sinon.spy(),
      enqueueAttributeDelete: sinon.spy(),
      enqueueProductFieldsUpload: sinon.spy(),
      getSubtaskResults: sinon.stub().returns([{result: true}]),
      dropAllCompletedChildren: sinon.spy()
    };

    await models.attributes.upsertAttribute(productId, {propertyId: 123, value_ids: [1], modified: true, deleted: true});

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, manager);
    expect(result).to.have.property('result', 'suspended');
    expect(result).to.have.property('suspensionPoint', 'attributesDelete');
    expect(manager.enqueueAttributeUpdate).to.not.have.been.called;
    expect(manager.enqueueAttributeDelete).to.have.been.calledOnce;
  });

  it('should not delete attribute if can_write_inventory flag is set to false', async function tests() {
    await models.products.update({
      id: productId,
      shop_id: shopId,
      [FIELDS.CAN_WRITE_INVENTORY]: false,
      [FIELDS.CHANGED_PROPERTIES]: [FIELDS.ATTRIBUTES]
    });

    const manager = {
      enqueueAttributeUpdate: sinon.spy(),
      enqueueAttributeDelete: sinon.spy(),
      enqueueProductFieldsUpload: sinon.spy(),
      getSubtaskResults: sinon.stub().returns([{result: true}]),
      dropAllCompletedChildren: sinon.spy()
    };

    await models.attributes.upsertAttribute(productId, {propertyId: 123, value_ids: [1], modified: true, deleted: true});

    etsyApiResponses.setupUploadListingInventorySuccess(LISTING_ID);
    const handler = opHandlers.uploadProduct;
    const result = await handler.start(null, models, null, productId, null, manager);
    expect(result).to.have.property('result', 'succeeded');
    expect(manager.enqueueAttributeUpdate).to.not.have.been.called;
    expect(manager.enqueueAttributeDelete).to.not.have.been.called;
  });
});
