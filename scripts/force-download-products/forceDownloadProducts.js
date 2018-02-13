import fs from 'fs';

import Db from '../../shared/postgresDb';
import { Logger } from '../../shared/logger';
import pgSquel from '../../shared/pgSquel';

const logger = new Logger('debug');
const configName = process.argv[2] || './config.json';
let db;

async function readConfig() {
  return new Promise((resolve, reject) => {
    fs.readFile(configName, 'utf8', (err, data) => {
      if (err) { reject(err); }
      else { resolve(JSON.parse(data)); }
    });
  });
}

async function writeConfig(cfg) {
  return new Promise((resolve, reject) => {
    fs.writeFile(configName, JSON.stringify(cfg, null, 2), 'utf8', (err) => {
      if (err) { reject(err); }
      else { resolve(true); }
    });
  });
}

async function shouldIgnoreShop(id) {
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('invalid')
    .field('sync_status')
    .where('id=?::bigint', id)
    .toParam();
  const shopInfo = await db.one(text, values);
  return shopInfo.invalid || shopInfo.sync_status !== 'up_to_date';
}

async function getProductIds(cfg) {
  const ignore = await shouldIgnoreShop(cfg.shopId);
  if (ignore) { return []; }
  const { text, values } = pgSquel
    .select()
    .from('product_properties')
    .field('id')
    .where('shop_id=?::bigint', cfg.shopId)
    .where('_hive_is_invalid=?::boolean', false)
    .where('_hive_on_new_schema=?::boolean', false)
    .limit(cfg.batchSize)
    .toParam();
  const res = await db.any(text, values);
  return res.map((item) => (item.id));
}

async function getNextShopId(id) {
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('id')
    .where('id>?::bigint', id)
    .where('invalid=?::boolean', false)
    .where('sync_status=?', 'up_to_date')
    .order('id', true)
    .limit(1)
    .toParam();
  const res = await db.any(text, values);
  if (!res.length) { return null; }
  else { return res[0].id; }
}

async function updateProductTimestamp(ids) {
  const { text, values } = pgSquel
    .update()
    .table('product_properties')
    .where('id in ?', ids)
    .set('channel_modification_timestamp', '1970-01-01')
    .toParam();
  return db.none(text, values);
}

async function updateShopTimestamp(id) {
  const { text, values } = pgSquel
    .update()
    .table('shops')
    .where('id=?::bigint', id)
    .set('last_sync_timestamp', '1970-01-01')
    .toParam();
  return db.none(text, values);
}

async function getShopInfo(id) {
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('sync_status')
    .field('last_sync_timestamp')
    .where('id=?::bigint', id)
    .toParam();
  return db.one(text, values);
}

async function waitFor(delay) {
  return new Promise((resolve, reject) => { setTimeout(resolve, delay); });
}

async function waitForSync(id, delay) {
  while (true) {
    let info = await getShopInfo(id);
    if
    (
      ((info.sync_status === 'up_to_date') && (info.last_sync_timestamp.getTime() === 0))  // the shop was not yet picked for sync'ing
      || (info.sync_status === 'sync')  // the shop is sync'ed now
    )
    {
      logger.info(`waiting for shop ${id} to get sync'ed...`);
    } else {
      return true;
    }
    await waitFor(delay);
  }
}

async function processNextBatch() {
  const configData = await readConfig();
  logger.info(`starting new batch, shop id: ${configData.etsy.shopId}`);
  const productIds = await getProductIds(configData.etsy);
  if (productIds.length) {
    logger.info(`will work on listings: ${productIds.join(', ')}`);
    await updateProductTimestamp(productIds);
    await updateShopTimestamp(configData.etsy.shopId);
    // >>> rabbit goes here <<<
    await waitForSync(configData.etsy.shopId, configData.etsy.delay);
  } else {
    logger.info(`done with shop id: ${configData.etsy.shopId}`);
    const nextShopId = await getNextShopId(configData.etsy.shopId);
    if (!nextShopId) { return false; }  // we are done
    configData.etsy.shopId = nextShopId;
  }
  await writeConfig(configData);
  return true;
}

async function main() {
  const configData = await readConfig();
  db  = new Db(Object.assign({ logger }, configData.db));
  let cont = true;
  while (cont) { cont = await processNextBatch(); }
}

main().
then(() => {
  logger.info('... and we are done!');
}).catch((err) => {
  logger.info(`Error: ${JSON.stringify(err)}`);
}).then(() => process.exit());
