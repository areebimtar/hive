import fs from 'fs';

import Db from '../../shared/postgresDb';
import { Logger } from '../../shared/logger';
import pgSquel from '../../shared/pgSquel';
import _ from 'lodash';
import moment from 'moment';

const stopFile = 'STOP_NOW';

const logger = new Logger('debug');
const configName = process.argv[2] || './config.json';
let db = {};

async function readConfig() {
  return new Promise((resolve, reject) => {
    fs.readFile(configName, 'utf8', (err, data) => {
      if (err) { reject(err); }
      else { resolve(JSON.parse(data)); }
    });
  });
}

function wrapException(text, exception) {
  throw new Error(`${text}(): ${exception.message}`);
}

async function getUserInfo(user, fromDB) {
  logger.info(`getting info about user with email "${user.email}"`);
  const { text, values } = pgSquel
    .select()
    .from('users')
    .field('id')
    .field('company_id')
    .where('db=?', fromDB)
    .where('email=?', user.email)
    .toParam();
  try {
    const result = await db.auth.one(text, values);
    logger.info(`    id: ${result.id}, company id: ${result.company_id}`);
    return result;
  } catch (err) {
    wrapException('getUserInfo', err);
  }
}

async function getAccounts(companyId) {
  const { text, values } = pgSquel
    .select()
    .from('accounts')
    .field('id')
    .field('channel_id')
    .field('company_id')
    .field('oauth_token')
    .field('oauth_token_secret')
    .where('company_id=?::bigint', companyId)
    .toParam();
  try {
    const result = await db.from.any(text, values);
    if (!result.length) {
      logger.info(`no account ids found for company id = ${companyId}`);
    } else {
      const mapped = _.map(result, 'id');
      logger.info(`    account id(s): ${mapped}`);
    }
    return result;
  } catch (err) {
    wrapException('getAccounts', err);
  }
}

async function getShops(ids) {
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('id')
    .field('account_id')
    .field('name')
    .field('channel_shop_id')
    .field('sync_status')
    .field('rabbit')
    .field('error')
    .field('applying_operations')
    .field('channel_user_id')
    .field('domain')
    .where('account_id in ?', ids)
    .toParam();
  try {
    const result = await db.from.any(text, values);
    if (result.length !== ids.length) {
      logger.info(`WARNING: number of found shops (${result.length}) does not match number of accounts (${ids.length})`);
    }
    const mapped = _.map(result, 'id');
    logger.info(`    shop id(s): ${mapped}`);
    return result;
  } catch (err) {
    wrapException('getShops', err);
  }
}

async function checkShops(shops) {
  if (!shops.length) { return; }
  const channelShopIds = _.map(shops, 'channel_shop_id');
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('channel_shop_id')
    .where('channel_shop_id in ?', channelShopIds)
    .toParam();
  try {
    const result = await db.to.any(text, values);
    if (result.length) {
      const ids = _.map(result, 'channel_shop_id');
      logger.info(`WARNING: shop(s) with id(s) ${JSON.stringify(ids)} are already imported in target DB`);
    }
  } catch (err) {
    wrapException('checkShops', err);
  }
  _.forEach(shops, (shop) => {
    if (shop.sync_status !== 'up_to_date' && shop.sync_status !== 'incomplete_duplicate' &&
        shop.sync_status !== 'incomplete' && shop.sync_status !== 'incomplete_shop_sync_in_vacation_mode') {
      throw new Error(`cannot move the user, their shop with id = ${shop.id} is in sync_status = "${shop.sync_status}"`);
    }
    if (shop.applying_operations !== false) {
      throw new Error(`cannot move the user, their shop with id = ${shop.id} is in process of applying operations`);
    }
  });
}

async function markShopsIncomplete(shopIds) {
  if (!shopIds.length) { return; }
  logger.info(`marking shops with id(s) = ${shopIds} as incomplete`);
  const { text, values } = pgSquel
    .update()
    .table('shops')
    .where('id in ?', shopIds)
    .set('sync_status', 'incomplete')
    .set('error', 'This shop is in maintenance now, we migrate it from one DB to another DB. Please try again in a few minutes.')
    .set('invalid', true)
    .toParam();
  try {
    await db.from.none(text, values);
  } catch (err) {
    wrapException('markShopsIncomplete', err);
  }
}

async function dropSessions(user) {
  logger.info(`dropping sessions (logging out the user) for user with email = "${user.email}"`);
  const { text, values } = pgSquel
    .delete()
    .from('session')
    .where(`sess::jsonb @> '{"email":"${user.email}"}'`)
    .toParam();
  try {
    const result = await db.auth.none(text, values);
  } catch (err) {
    wrapException('dropSessions', err);
  }
}

async function createInNewDB(accounts, shops) {
  let result;
  const shopIds = [];
  for (let i = 0; i  < accounts.length; i++) {
    const account = accounts[i];
    const shop = _.filter(shops, { account_id: account.id })[0];
    if (!shop) { continue; }
    if (shop.sync_status === 'incomplete_duplicate') {
      logger.info(`account id = ${account.id} / shop with id = ${shop.id} ignored, shop in sync_status "${shop.sync_status}"`);
      continue;
    }
    logger.info(`creating new record for account:\n${JSON.stringify(account, null, 2)}\nin new DB`);
    delete account.id;
    const q1 = pgSquel
      .insert()
      .into('accounts')
      .setFields(account)
      .returning('id')
      .toParam();
    try {
      result = await db.to.one(q1.text, q1.values);
    } catch (err) {
      wrapException('createInNewDB', err);
    }
    logger.info(`created account record with id = ${result.id}`);
    logger.info(`creating new record for shop:\n${JSON.stringify(shop, null, 2)}\nin new DB`);
    delete shop.id;
    shop.account_id = parseInt(result.id, 10);
    shop.inventory = true;
    shop.last_sync_timestamp = '1970-01-01';
    const q2 = pgSquel
      .insert()
      .into('shops')
      .setFields(shop)
      .returning('id')
      .toParam();
    try {
      result = await db.to.one(q2.text, q2.values);
    } catch (err) {
      wrapException('createInNewDB', err);
    }
    logger.info(`created shop record with id = ${result.id}`);
    shopIds.push(result.id);
  }
  return shopIds;
}

async function getProgress(ids) {
  const { text, values } = pgSquel
    .select()
    .from('shops')
    .field('id')
    .field('sync_status')
    .field('last_sync_timestamp')
    .where('id in ?', ids)
    .toParam();
  return db.to.many(text, values);
}

async function waitFor(delay) {
  return new Promise((resolve, reject) => { setTimeout(resolve, delay); });
}

async function waitForSync(ids, delay) {
  while (true) {
    let shops = await getProgress(ids);
    let wait = false;
    _.forEach(shops, (shop) => {
      if ((shop.sync_status === 'up_to_date') && (shop.last_sync_timestamp.getTime() === 0)) {
        wait = true;
        logger.info(`sync of shop with id = ${shop.id} has not started yet, waiting...`);
      } else if (shop.sync_status === 'sync') {
        wait = true;
        logger.info(`sync of shop with id = ${shop.id} in progress now, waiting...`);
      } else {
        logger.info(`sync of shop with id = ${shop.id} is done`);
      }
    });
    if (wait) {
      await waitFor(delay);
    } else {
      return;
    }
  }
}

async function updateUserDB(user, toDB) {
  logger.info(`updating DB field (to ${toDB}) in users table for email ${user.email}`);
  const { text, values } = pgSquel
    .update()
    .table('users')
    .where('email=?', user.email)
    .set('db', toDB)
    .toParam();
  try {
    await db.auth.none(text, values);
  } catch (err) {
    wrapException('updateUserDB', err);
  }
}

async function moveUserProfile(id, fromDB, toDB) {
  let result;
  logger.info(`moving user profile from ${fromDB} to ${toDB} (for user id: ${id})`);
  const q1 = pgSquel
    .select()
    .from('user_profiles')
    .field('user_id')
    .field('property_name')
    .field('property_value')
    .field('modified_at')
    .where('user_id=?::bigint', id)
    .toParam();
  try {
    result = await db.from.any(q1.text, q1.values);
    _.map(result, (item) => _.set(item, 'modified_at', moment(item.modified_at).toISOString()));
  } catch (err) {
    wrapException('moveUserProfile', err);
  }
  if (result.length) {
    const q2 = pgSquel
      .insert()
      .into('user_profiles')
      .setFieldsRows(result)
      .toParam();
    try {
      await db.to.none(q2.text, q2.values);
    } catch (err) {
      wrapException('moveUserProfile', err);
    }
    const q3 = pgSquel
      .delete()
      .from('user_profiles')
      .where('user_id=?::bigint', id)
      .toParam();
    try {
      await db.from.none(q3.text, q3.values);
    } catch (err) {
      wrapException('moveUserProfile', err);
    }
  }
}

async function removeShopsFromSourceDB(ids) {
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    logger.info(`removing shop with id = ${id} from source DB`);
    try {
      await db.from.any(`select deleteshop(${id})`);
    } catch (err) {
      wrapException('removeShopsFromSourceDB', err);
    }
  }
}

async function migrateUser(user, options) {
  const userInfo = await getUserInfo(user, options['db-from'].name);
  const accounts = await getAccounts(userInfo.company_id);
  let shopIds = [];
  let newShopIds = [];

  if (accounts.length) {
    const accountIds = _.map(accounts, 'id');
    const shops = await getShops(accountIds);
    shopIds = _.map(shops, 'id');
    await checkShops(shops);
    await markShopsIncomplete(shopIds);
    await dropSessions(user);
    newShopIds = await createInNewDB(accounts, shops);
  }
  await updateUserDB(user, options['db-to'].name);
  await moveUserProfile(userInfo.id, options['db-from'].name, options['db-to'].name);
  if (newShopIds.length) {
    await waitForSync(newShopIds, options.sync.delay);
  }
  await dropSessions(user);
  logger.info('>>>>> USER SUCCESSFULLY MIGRATED! <<<<<');
  await removeShopsFromSourceDB(shopIds);
}

async function main() {
  const configData = await readConfig();
  db.auth = new Db(Object.assign({ logger }, configData['db-auth']));
  db.from = new Db(Object.assign({ logger }, configData['db-from']));
  db.to = new Db(Object.assign({ logger }, configData['db-to']));
  for (let i = 0; i < configData.users.length; i++) {
    try {
      fs.statSync(stopFile);
      logger.info(`stop file (${stopFile}) detected, stopping now`);
      return;
    } catch (err) {
      // pass: can continue
    }
    try {
      await migrateUser({ email: configData.users[i] }, configData);
    } catch (err) {
      logger.error(err.message);
    }
  }
}

main().
then(() => {
  logger.info('... and we are done!');
}).catch((err) => {
  logger.error(err.message);
}).then(() => process.exit());
