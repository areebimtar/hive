import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import moment from 'moment';
import { createDbHelper, opHandlers, deleteAllShops, deleteAllFrom } from '../../../test/util';
import * as etsyApiResponses from '../../../test/fixtures/etsyApiResponses';

const dbHelper = createDbHelper();

const COMPANY_ID = 123;

describe('Sync shop', () => {
  let rawDb;
  let models;
  let shopId;
  let accountId;

  beforeEach(async function beforeEach() {
    rawDb = dbHelper.getDb();

    await deleteAllShops(rawDb);

    models = dbHelper.getModels();
    accountId = await models.accounts.add(COMPANY_ID, 1, 'oauth_token', 'oauth_secret');
    shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe', channel_shop_id: '101'}));
  });

  afterEach(async function beforeEach() {
    await deleteAllShops(rawDb);
    await deleteAllFrom(rawDb, 'accounts');
  });

  it('Deletes shops if etsy gives a 403 error and says the token is revoked', async function test() {
    let shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopError(etsyShopId, { status: 403, text: 'oauth_problem=token_revoked'});
    const result = await opHandlers.syncShop.start(null, null, null, shopId, null);
    expect(result).to.have.property('result', 'succeeded');
    shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(0);
  });

  // Haven't enabled this behavior yet because it's destructive
  it.skip('Deletes shops if etsy gives a 404 error', async function test() {
    let shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopError(etsyShopId, { status: 404 });
    const result = await opHandlers.syncShop.start(null, null, null, shopId, null);
    expect(result).to.have.property('result', 'succeeded');
    shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(0);
  });


  it('Does not delete shop if etsy gives a 500 error', async function test() {
    let shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopError(etsyShopId, { status: 500 });
    await expect(opHandlers.syncShop.start(null, null, null, shopId, null)).to.eventually.be.rejected;
    shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    expect(shopsArray[0]).to.have.property('id', shopId);
  });

  it('Marks shop invalid if etsy gives a 404 error and says the shop not found', async function test() {
    const now = moment().unix();
    const shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopError(etsyShopId, { status: 404, text: 'Shop not found'});
    const result = await opHandlers.syncShop.start(null, null, null, shopId, null);
    expect(result).to.have.property('result', 'aborted');
    const shop = await models.shops.getById(shopId);
    expect(shop.sync_status).to.eql('not_found');
    expect(shop.invalid).to.eql(true);
    expect(shop.last_sync_timestamp - now > 0).to.eql(true);
  });

  it('Marks shop invalid if etsy gives a 403 error and says token rejected', async function test() {
    const now = moment().unix();
    const shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopError(etsyShopId, { status: 403, text: 'oauth_problem=token_rejected'});
    const result = await opHandlers.syncShop.start(null, null, null, shopId, null);
    expect(result).to.have.property('result', 'aborted');
    const shop = await models.shops.getById(shopId);
    expect(shop.sync_status).to.eql('token_rejected');
    expect(shop.invalid).to.eql(true);
    expect(shop.last_sync_timestamp - now > 0).to.eql(true);
  });

  it('Skips shop sync if shop is invalid', async function test() {
    const date = '2017-06-06T00:00:00.000Z';
    const inProgressShopId = String(await models.shops.addShop(accountId, { name: 'the shoppe', channel_shop_id: '102', sync_status: 'upto_date', last_sync_timestamp: date, invalid: true }));
    const result = await opHandlers.syncShop.start(null, null, null, inProgressShopId, null);
    expect(result).to.have.property('result', 'succeeded');
    const shop = await models.shops.getById(inProgressShopId);
    expect(moment(shop.last_sync_timestamp).toISOString()).to.eql(date);
  });

  it('Updates Etsy user ID', async function test() {
    let shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    const etsyShopId = shopsArray[0].channel_shop_id;
    etsyApiResponses.setupGetShopSuccess(etsyShopId, {is_vacation: true});
    const result = await opHandlers.syncShop.start(null, null, null, shopId, null);
    expect(result).to.have.property('result', 'aborted');
    shopsArray = await models.shops.getByCompanyId(COMPANY_ID);
    expect(shopsArray).to.have.length(1);
    expect(shopsArray[0].channel_user_id).to.eql('72269314');
  });
});
