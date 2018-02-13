import _ from 'lodash';
import squel from 'squel';

import Db from '../../shared/postgresDb';
import { Logger } from '../../shared/logger';
import {resolveQualifiersForOptionList} from '../../shared/modules/etsy/variations/optionParser';

const pgSquel = squel.useFlavour('postgres');

const logger = new Logger('debug');

const config = {
  db: {
    "host": process.env.DB_HOST || "localhost",
    "port": process.env.DB_PORT || 5432,
    "database": process.env.DB_NAME || "hive",
    "password": process.env.DB_PASSWORD,
    "user": "hive",
    logger: logger,
    logQueries: true
  }
};

const db = new Db(config.db);

async function getVariationsWithOptions(connection) {
  const sqlStmt =
  `SELECT
  variations.id AS variation_id, variations.product_id AS variation_product_id, variations.first AS variation_first, variations.property_id AS variation_property_id,
    variations.formatted_name AS variation_formatted_name, variations.scaling_option_id AS variation_scaling_option_id,
    p1.property_value AS variation_recipient, p2.property_value AS variation_taxonomy_id,
    variation_options.id AS option_id, variation_options.value_id AS option_value_id, variation_options.value AS option_value, variation_options.formatted_value AS option_formatted_value
  FROM variations
  INNER JOIN variation_options ON (variations.id = variation_options.variation_id)
  LEFT OUTER JOIN products p1 ON (p1.id = variations.product_id AND p1.property_name = 'recipient')
  LEFT OUTER JOIN products p2 ON (p2.id = variations.product_id AND p2.property_name = 'taxonomy_id')
  WHERE
   (variations.property_id in (100,501,504,505,506,511,512));
`;
  const pickByPrefix = (obj, prefix) => {
    const newObj = {};
    Object.keys(obj).forEach(key => {
      if (key.startsWith(prefix)) {
        newObj[key.replace(prefix, '').replace(/_([a-z])/g, g => g[1].toUpperCase())] = obj[key];
      }
    });
    return newObj;
  };

  return connection.any(sqlStmt).then(allVariationOptions => {

    // convert option value id to number from string
    _.each(allVariationOptions, vo => {
      const origValue = vo.option_value_id;
      const newValue = parseInt(origValue);
      vo.option_value_id = newValue;
    });


    const variationOptionsByProductId = _.groupBy(allVariationOptions, 'variation_product_id');
    return _.mapValues(variationOptionsByProductId, (variationOptionsForProduct) => {
      const variations = _.groupBy(variationOptionsForProduct, 'variation_id');
      return _.mapValues(variations, variationOptionsForVariation => {
        const variation = pickByPrefix(variationOptionsForVariation[0], 'variation_');
        variation.options = variationOptionsForVariation.map(option => pickByPrefix(option, 'option_'));
        return variation;
      });
    });
  });
}

function getComputeValues(variation) {
  const { id, taxonomyId, propertyId, options, recipient, productId } = variation;
  const { scaleId, recipientId } = resolveQualifiersForOptionList(taxonomyId, propertyId, options, recipient);

  // if (recipientId || scaleId) {
  //   console.log(`id=${id}: resolveQualifiersForOptionList(${taxonomyId}, ${propertyId}, ${JSON.stringify(options)}, ${recipient}) = ${JSON.stringify({ scaleId, recipientId})}`);
  // }

  return { id, productId, scaleId, recipientId };
}

async function updateVariations(updates) {
  return Promise.all(_.map(updates, update => {

    const { recipientId, scaleId, id } = update;
    const { text, values } = pgSquel.update().table('variations')
      .setFields({ recipient_id: recipientId, scaling_option_id: scaleId})
      .where('id = ?::bigint', id).toParam();

    // logger.info(`DB update query: ${text} (params = ${JSON.stringify(values)})`);
    return db.any(text, values);
  }));
}

// Takes array of variations (with options but without product properties - recipient, taxonomy_id)
// and computes all necessary information for updating DB table
// and does the DB update
async function processVariationsBlock(i, variations) {
  logger.info(`Starting processing of block #${i} (size ${variations.length})`);

  const tentativeUpdates = _.map(variations, getComputeValues);
  const realUpdates = _.filter(tentativeUpdates, u => u.scaleId || u.recipientId);

  logger.info(`Start to push updates on block #${i}`);
  logger.info(`There is #${realUpdates.length} updates.`);

  await updateVariations(realUpdates);

  logger.info(`Updating DB finished on block #${i}`);
}

async function go(i, j, variations) {

  if (j > variations.length) {
    return undefined;
  }

  logger.debug(`go(${i},${j})`);

  const BATCH_SIZE = 10000;
  const block = variations.slice(j, j + BATCH_SIZE);

  return processVariationsBlock(i, block).then(() => {
    return go(i+1, j+BATCH_SIZE, variations);
  });
}

async function main() {

  console.log('DB Config: ', config.db);

  let variations = await getVariationsWithOptions(db);

  logger.info('Read all options into memory');
  variations = _.map(variations, (productVariations) => Object.values(productVariations) );
  variations = _.flatten(variations, true);

  logger.info(`There is ${variations.length} of variations that needs to be populated`);

  return go(1, 0, variations);
}



main().
then(() => {
  logger.info('Successful finish');
}).catch((err) => {
  logger.info(`Error: ${JSON.stringify(err)}`);
}).then(() => process.exit());