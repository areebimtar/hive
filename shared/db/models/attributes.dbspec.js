import _ from 'lodash';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { createDbHelper } from '../../../test/util';
import { FIELDS } from '../../modules/etsy/constants';

const dbHelper = createDbHelper();

describe('Attributes model', () => {
  let db;
  let models;
  let accountId;
  let productId;

  before(async function before() {
    models = dbHelper.getModels();
    db = dbHelper.getDb();
    accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    const shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe'}));
    const product = {
      [FIELDS.SHOP_ID]: shopId,
      [FIELDS.LISTING_ID]: 123,
      [FIELDS.STATE]: 'draft'
    };
    productId = String(await models.products.insert(product));
  });

  after(async function after() {
    await models.accounts.deleteById(accountId);
  });

  describe('upsertAttribute', () => {
    let attributeId;

    before(async function before() {
      // reset sequences
      await db.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');

      const attribute = {
        propertyId: 12345,
        scaleId: 234,
        valueIds: [1]
      };
      attributeId = await models.attributes.upsertAttribute(productId, attribute);
    });

    after(async () => {
      await db.none(`DELETE FROM attributes where product_id=${productId}::bigint;`);
    });

    it('should add attribute', async () => {
      const expected = [{
        id: '1',
        product_id: productId,
        property_id: '12345',
        scale_id: '234',
        value_ids: ['1'],
        deleted: false,
        modified: true
      }];

      const dbAttribute = await db.any(`SELECT * from attributes where id = ${attributeId}`);
      expect(dbAttribute).to.have.length(1);
      expect(dbAttribute).to.eql(expected);
    });

    it('should update attribute', async () => {
      const expected = [{
        id: '1',
        product_id: productId,
        property_id: '2345',
        scale_id: '345',
        value_ids: ['2', '3'],
        deleted: false,
        modified: true
      }];

      const attribute = {
        id: 1,
        propertyId: 2345,
        scaleId: 345,
        valueIds: [2, 3]
      };

      attributeId = await models.attributes.upsertAttribute(productId, attribute);

      const dbAttribute = await db.any(`SELECT * from attributes where id = ${attributeId}`);
      expect(dbAttribute).to.have.length(1);
      expect(dbAttribute).to.eql(expected);
    });

    it('should not fail if more properties in attribute than needed are passed in', async () => {
      const expected = [{
        id: '1',
        product_id: productId,
        property_id: '2345',
        scale_id: '345',
        value_ids: ['2', '3'],
        deleted: false,
        modified: true
      }];

      const attribute = {
        id: 1,
        propertyId: 2345,
        scaleId: 345,
        valueIds: [2, 3],
        something: 'qw',
        foo: { bar: [] }
      };

      attributeId = await models.attributes.upsertAttribute(productId, attribute);

      const dbAttribute = await db.any(`SELECT * from attributes where id = ${attributeId}`);
      expect(dbAttribute).to.have.length(1);
      expect(dbAttribute).to.eql(expected);
    });

    it('should set modified flag with value from attribute', async () => {
      const expected = [{
        id: '1',
        product_id: productId,
        property_id: '2345',
        scale_id: '345',
        value_ids: ['2', '3'],
        deleted: false,
        modified: false
      }];

      const attribute = {
        id: 1,
        propertyId: 2345,
        scaleId: 345,
        valueIds: [2, 3],
        modified: false
      };

      attributeId = await models.attributes.upsertAttribute(productId, attribute);

      const dbAttribute = await db.any(`SELECT * from attributes where id = ${attributeId}`);
      expect(dbAttribute).to.have.length(1);
      expect(dbAttribute).to.eql(expected);
    });

    it('should clead deleted flag on updated attribute', async () => {
      const expected = [{
        id: '1',
        product_id: productId,
        property_id: '2345',
        scale_id: '345',
        value_ids: ['2', '3'],
        deleted: false,
        modified: true
      }];

      const attribute = {
        id: 1,
        propertyId: 2345,
        scaleId: 345,
        valueIds: [2, 3]
      };

      await db.any('UPDATE attributes set deleted = true::boolean where id = 1');
      attributeId = await models.attributes.upsertAttribute(productId, attribute);

      const dbAttribute = await db.any(`SELECT * from attributes where id = ${attributeId}`);
      expect(dbAttribute).to.have.length(1);
      expect(dbAttribute).to.eql(expected);
    });
  });

  describe('upsertAttributes', () => {
    let attributeIds;

    before(async function before() {
      // reset sequences
      await db.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');

      const attributes = _.range(13).map(i => ({
        propertyId: i * 1000,
        scaleId: i * 100,
        valueIds: [i, i * 2]
      }));
      attributeIds = await models.attributes.upsertAttributes(productId, attributes);
    });

    after(async () => {
      await db.none(`DELETE FROM attributes where product_id=${productId}::bigint;`);
    });

    it('should add attributes', async () => {
      expect(attributeIds.length).to.eql(13);
      const dbAttributes = await db.any(`SELECT * from attributes where id in (${attributeIds.join(', ')})`);
      for (let i = 0; i < 13; ++i) {
        expect(dbAttributes[i]).to.eql({
          id: String(i + 1),
          product_id: String(productId),
          property_id: String(i * 1000),
          scale_id: String(i * 100),
          value_ids: [String(i), String(i * 2)],
          deleted: false,
          modified: true
        });
      }
    });

    it('should update attributes', async () => {
      expect(attributeIds.length).to.eql(13);
      const attributes = _.range(13).map(i => ({
        id: i + 1,
        propertyId: i * 2000,
        scaleId: i * 200,
        valueIds: [i, i * 4]
      }));
      attributeIds = await models.attributes.upsertAttributes(productId, attributes);

      const dbAttributes = await db.any(`SELECT * from attributes where id in (${attributeIds.join(', ')})`);
      for (let i = 0; i < 13; ++i) {
        expect(dbAttributes[i]).to.eql({
          id: String(i + 1),
          product_id: String(productId),
          property_id: String(i * 2000),
          scale_id: String(i * 200),
          value_ids: [String(i), String(i * 4)],
          deleted: false,
          modified: true
        });
      }
    });
  });

  describe('getByProductId', () => {
    before(async function before() {
      // reset sequences
      await db.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');

      const attributes = _.range(3).map(i => ({
        propertyId: i + 1,
        scaleId: i + 11,
        valueIds: [i + 1],
        deleted: !!(i % 2)
      }));
      await models.attributes.upsertAttributes(productId, attributes);
    });

    after(async () => {
      await db.none(`DELETE FROM attributes where product_id=${productId}::bigint;`);
    });

    it('should get attributes', async () => {
      const attributes = await models.attributes.getByProductId(productId);
      expect(attributes.length).to.eql(2);
      expect(attributes).to.eql([
        { id: '1', product_id: String(productId), property_id: '1', scale_id: '11', value_ids: ['1'], deleted: false, modified: true },
        { id: '3', product_id: String(productId), property_id: '3', scale_id: '13', value_ids: ['3'], deleted: false, modified: true }
      ]);
    });

    it('should get all attributes (even deleted ones)', async () => {
      const attributes = await models.attributes.getByProductId(productId, true);
      expect(attributes.length).to.eql(3);
      expect(attributes).to.eql([
        { id: '1', product_id: String(productId), property_id: '1', scale_id: '11', value_ids: ['1'], deleted: false, modified: true },
        { id: '2', product_id: String(productId), property_id: '2', scale_id: '12', value_ids: ['2'], deleted: true, modified: true },
        { id: '3', product_id: String(productId), property_id: '3', scale_id: '13', value_ids: ['3'], deleted: false, modified: true }
      ]);
    });
  });

  describe('deleteById', () => {
    beforeEach(async function before() {
      // reset sequences
      await db.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');

      const attributes = _.range(3).map(i => ({
        propertyId: i + 1,
        scaleId: i + 11,
        valueIds: [i + 1],
        deleted: false
      }));
      await models.attributes.upsertAttributes(productId, attributes);
    });

    afterEach(async () => {
      await db.none(`DELETE FROM attributes where product_id=${productId}::bigint;`);
    });

    it('should "delete" (set deleted flag to true) attribute', async () => {
      await models.attributes.deleteById(2);
      const attributes = await db.any(`SELECT * FROM attributes ORDER BY id;`);
      expect(attributes.length).to.eql(3);
      expect(attributes).to.eql([
        { id: '1', product_id: String(productId), property_id: '1', scale_id: '11', value_ids: ['1'], deleted: false, modified: true },
        { id: '2', product_id: String(productId), property_id: '2', scale_id: '12', value_ids: ['2'], deleted: true, modified: false },
        { id: '3', product_id: String(productId), property_id: '3', scale_id: '13', value_ids: ['3'], deleted: false, modified: true }
      ]);
    });

    it('should delete (remove row) attribute', async () => {
      await models.attributes.deleteById(2, false);
      const attributes = await db.any(`SELECT * FROM attributes ORDER BY id;`);
      expect(attributes.length).to.eql(2);
      expect(attributes).to.eql([
        { id: '1', product_id: String(productId), property_id: '1', scale_id: '11', value_ids: ['1'], deleted: false, modified: true },
        { id: '3', product_id: String(productId), property_id: '3', scale_id: '13', value_ids: ['3'], deleted: false, modified: true }
      ]);
    });
  });

  describe('deleteByIds', () => {
    beforeEach(async function before() {
      // reset sequences
      await db.none('ALTER SEQUENCE attributes_id_seq RESTART WITH 1;');

      const attributes = _.range(3).map(i => ({
        propertyId: i + 1,
        scaleId: i + 11,
        valueIds: [i + 1],
        deleted: false
      }));
      await models.attributes.upsertAttributes(productId, attributes);
    });

    afterEach(async () => {
      await db.none(`DELETE FROM attributes where product_id=${productId}::bigint;`);
    });

    it('should "delete" (set deleted flag to true) attribute', async () => {
      await models.attributes.deleteByIds([1, 2, 3]);
      const attributes = await db.any(`SELECT * FROM attributes ORDER BY id;`);
      expect(attributes.length).to.eql(3);
      expect(attributes).to.eql([
        { id: '1', product_id: String(productId), property_id: '1', scale_id: '11', value_ids: ['1'], deleted: true, modified: false },
        { id: '2', product_id: String(productId), property_id: '2', scale_id: '12', value_ids: ['2'], deleted: true, modified: false },
        { id: '3', product_id: String(productId), property_id: '3', scale_id: '13', value_ids: ['3'], deleted: true, modified: false }
      ]);
    });

    it('should delete (remove row) attribute', async () => {
      await models.attributes.deleteByIds([1, 2, 3], false);
      const attributes = await db.any(`SELECT * FROM attributes ORDER BY id;`);
      expect(attributes.length).to.eql(0);
    });
  });
});
