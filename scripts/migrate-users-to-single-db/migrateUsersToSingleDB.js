import fs from 'fs';

import Db from '../../shared/postgresDb';
import { Logger } from '../../shared/logger';
import pgSquel from '../../shared/pgSquel';
import _ from 'lodash';
import moment from 'moment';

const logger = new Logger('debug');
const configName = process.argv[2] || './config.json';
let db = {};
const shopIdsToDelete = [];

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

async function getAccounts(options, companyId) {
  const from = options['get-accounts'];
  const { text, values } = pgSquel
    .select()
    .from(from.table)
    .field('*')
    .where('company_id=?::bigint', companyId)
    .toParam();
  try {
    const result = await db[from.db].any(text, values);
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

async function getShops(options, ids) {
  const from = options['get-shops'];
  const { text, values } = pgSquel
    .select()
    .from(from.table)
    .field('*')
    .where('account_id in ?', ids)
    .toParam();
  try {
    const result = await db[from.db].many(text, values);
    if (result.length !== ids.length) {
      throw new Error(`number of found shops (${result.length}) does not match number of accounts (${ids.length})`);
    }
    const mapped = _.map(result, 'id');
    logger.info(`    shop id(s): ${mapped}`);
    return result;
  } catch (err) {
    wrapException('getShops', err);
  }
}

async function createInNewDB(options, accounts, shops) {
  let result;
  let into;
  const shopIds = [];
  for (let i = 0; i  < accounts.length; i++) {
    const account = accounts[i];
    const shop = _.filter(shops, { account_id: account.id })[0];
    if (shop.sync_status === 'token_rejected' || shop.sync_status === 'not_found') {
      logger.info(`account id = ${account.id} / shop with id = ${shop.id} ignored, shop in sync_status "${shop.sync_status}"`);
      continue;
    }
    delete account.id;
    logger.info(`creating new record for account:\n${JSON.stringify(account, null, 2)}\nin new DB`);
    into = options['create-account'];
    const q1 = pgSquel
      .insert()
      .into(into.table)
      .setFields(account)
      .returning('id')
      .toParam();
    try {
      result = await db[into.db].one(q1.text, q1.values);
    } catch (err) {
      wrapException('createInNewDB', err);
    }
    logger.info(`created account record with id = ${result.id}`);
    delete shop.id;
    shop.account_id = parseInt(result.id, 10);
    shop.inventory = true;
    shop.last_sync_timestamp = '1970-01-01';
    logger.info(`creating new record for shop:\n${JSON.stringify(shop, null, 2)}\nin new DB`);
    into = options['create-shop'];
    const q2 = pgSquel
      .insert()
      .into(into.table)
      .setFields(shop)
      .returning('id')
      .toParam();
    try {
      result = await db[into.db].one(q2.text, q2.values);
    } catch (err) {
      wrapException('createInNewDB', err);
    }
    logger.info(`created shop record with id = ${result.id}`);
    shopIds.push(result.id);
  }
  return shopIds;
}

async function dropSessions(options, user) {
  const from = options['drop-sessions'];
  logger.info(`dropping sessions (logging out the user) for user with email = "${user.email}"`);
  const { text, values } = pgSquel
    .delete()
    .from(from.table)
    .where(`sess::jsonb @> '{"email":"${user.email}"}'`)
    .toParam();
  try {
    const result = await db[from.db].none(text, values);
  } catch (err) {
    wrapException('dropSessions', err);
  }
}

async function migrateUser(options, user) {
  // user: a row from users table.
  logger.info(`\n\n\n>>>>> MIGRATING USER (id: ${user.id}, email: ${user.email})`);
  const accounts = await getAccounts(options, user.company_id);
  let shopIds;
  if (accounts.length) {
    const accountIds = _.map(accounts, 'id');
    const shops = await getShops(options, accountIds);
    shopIds = _.map(shops, 'id');
    _.forEach(shopIds, (id) => { shopIdsToDelete.push(id); });
    await createInNewDB(options, accounts, shops);
    await dropSessions(options, user);
  }
  logger.info('>>>>> USER MIGRATED!');
}

async function getAllUsers(options) {
  const from = options['get-all-db2-users'];
  const { text, values } = pgSquel
    .select()
    .from(from.table)
    .field('*')
    .where('db=?', 'db2')
    .toParam();
  try {
    const result = await db[from.db].many(text, values);
    logger.info(`... found ${result.length} users`);
    return result;
  } catch (err) {
    wrapException('getAllUsers', err);
  }
}

async function removeAllOldShopsFromDB2(options) {
  logger.info(`\n\n\n\n\n\n\n\n\n\nREMOVING SHOPS FROM DB (count: ${shopIdsToDelete.length})`);
  logger.info(shopIdsToDelete);
  const from = options['remove-shop'];
  for (let i = 0; i < shopIdsToDelete.length; i++) {
    const id = shopIdsToDelete[i];
    logger.info(`removing shop with id = ${id}`);
    try {
      await db[from.db].any(`select deleteshop(${id})`);
    } catch (err) {
      wrapException('removeAllOldShopsFromDB2', err);
    }
  }
}

async function main() {
  const configData = await readConfig();
  _.forEach(_.keys(configData), (key) => {
    if (key.substr(0, 2) === 'db') {
      db[key] = new Db(Object.assign({ logger }, configData[key]));
    }
  });
  const options = configData.queries;
  const users = await getAllUsers(options);
  for (let i = 0; i < users.length; i++) {
    try {
      await migrateUser(options, users[i]);
    } catch (err) {
      logger.error(err.message);
    }
  }
  await removeAllOldShopsFromDB2(options);
}

main().
then(() => {
  logger.info('... and we are done!');
}).catch((err) => {
  logger.error(err.message);
}).then(() => process.exit());
