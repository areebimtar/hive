import { expect } from 'chai';
import { createDbHelper } from './../util';

const dbHelper = createDbHelper();

describe('sample db tests', () => {
  let models;
  let accountId;
  let shopId;

  before(async function before() {
    models = dbHelper.getModels();
    accountId = await models.accounts.add(123, 1, 'oauth_token', 'oauth_secret');
    shopId = String(await models.shops.addShop(accountId, { name: 'the shoppe' }));
  });

  after(async function after() {
    const rawDb = dbHelper.getDb();
    await rawDb.any(`SELECT deleteshop(${shopId});`);
    await models.accounts.deleteById(accountId);
  });

  it('creates db and models', async function test() {
    const shops = await models.shops.getByCompanyId(123);
    expect(shops).to.be.an('array').with.length(1);
    expect(shops[0]).to.have.property('id', shopId);
  });
});
