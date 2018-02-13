import { expect } from 'chai';
import _ from 'lodash';
import { createDbHelper, deleteAllShops, insert, select } from '../../../test/util';

const dbHelper = createDbHelper();

describe('Shops model', () => {
  let db;
  let models;

  before(async function before() {
    db = dbHelper.getDb();
    models = dbHelper.getModels();
  });

  beforeEach(async () => {
    await deleteAllShops(db);
  });

  afterEach(async function before() {
    await deleteAllShops(db);
  });

  describe('resetError', () => {
    const shopNames = ['shop1'];
    const allShops = [];

    beforeEach(async function before() {
      let nextId = 0;
      for (const shopName of shopNames) {
        ++nextId;

        const newShop = {
          id: nextId.toString(),
          account_id: nextId.toString(),
          name: shopName,
          to_download: 0,
          downloaded: 0,
          to_upload: 0,
          uploaded: 0,
          rabbit: false,
          last_sync_timestamp: '1999-01-01 00:00:00+01',
          inventory: false,
          to_apply: 0,
          applied: 0,
          error: 'error'
        };
        await insert(db, 'accounts', {
          id: nextId,
          channel_id: 1,
          company_id: 1
        });
        await insert(db, 'shops', newShop);

        allShops.push(newShop);
      }
    });

    it('sets error to null', async () => {
      await models.shops.resetError(allShops[0].id);
      const shop = await select(db, 'shops', allShops[0].id);
      expect(shop.error).to.be.null;
    });
  });

  describe('searchShops', () => {
    const returnedFields = ['id', 'name'];
    const shopNames = ['search-121212', 'search', 'dummy-1', 'dummy-2', 'user0'];
    let allShops;

    beforeEach(async function before() {
      allShops = [];
      let nextId = 0;
      for (const shopName of shopNames) {
        ++nextId;

        const newShop = {
          id: nextId.toString(),
          account_id: nextId.toString(),
          name: shopName,
          to_download: 0,
          downloaded: 0,
          to_upload: 0,
          uploaded: 0,
          rabbit: false,
          last_sync_timestamp: '1999-01-01 00:00:00+01',
          inventory: false,
          to_apply: 0,
          applied: 0
        };
        await insert(db, 'accounts', {
          id: nextId,
          channel_id: 1,
          company_id: 1
        });
        await insert(db, 'shops', newShop);

        allShops.push(newShop);
      }
    });

    it('returns all shops when no query is provided', async () => {
      const shops = await models.shops.searchShops();
      expect(shops.length).to.eql(allShops.length);
      for (const shop of shops) {
        const controlShop = _.find(allShops, shopTmp => shop.id === shopTmp.id);
        expect(_.pick(shop, returnedFields)).to.eql(_.pick(controlShop, returnedFields));
      }
    });

    it('returns all shops when empty query is provided', async () => {
      const shops = await models.shops.searchShops('');
      expect(shops.length).to.eql(allShops.length);
      for (const shop of shops) {
        const controlShop = _.find(allShops, shopTmp => shop.id === shopTmp.id);
        expect(_.pick(shop, returnedFields)).to.eql(_.pick(controlShop, returnedFields));
      }
    });

    it('returns appropriate shop when single one should be returned', async () => {
      const shops = await models.shops.searchShops('121212');
      expect(shops.length).to.eql(1);
      expect(_.pick(shops[0], returnedFields)).to.eql(_.pick(allShops[0], returnedFields));
    });

    it('returns appropriate shops when multiple shops should be returned', async () => {
      const shops = await models.shops.searchShops('search');
      expect(shops.length).to.eql(2);
      for (const shop of shops) {
        const controlShop = _.find(allShops, shopTmp => shop.id === shopTmp.id);
        expect(_.pick(shop, returnedFields)).to.eql(_.pick(controlShop, returnedFields));
      }
    });

    it('returns appropriate user when query is number 0', async () => {
      const shops = await models.shops.searchShops(0);
      expect(shops.length).to.eql(1);
      expect(_.pick(shops[0], returnedFields)).to.eql(_.pick(allShops[4], returnedFields));
    });

    it('returns appropriate user when query is non-zero number', async () => {
      const shops = await models.shops.searchShops(121212);
      expect(shops.length).to.eql(1);
      expect(_.pick(shops[0], returnedFields)).to.eql(_.pick(allShops[0], returnedFields));
    });

    it('case of the query is ignored', async () => {
      const shops = await models.shops.searchShops('SeaRCH');
      expect(shops.length).to.eql(2);
      for (const shop of shops) {
        const controlShop = _.find(allShops, shopTmp => shop.id === shopTmp.id);
        expect(_.pick(shop, returnedFields)).to.eql(_.pick(controlShop, returnedFields));
      }
    });
  });
});
