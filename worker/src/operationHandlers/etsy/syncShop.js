import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';

// import Etsy from 'global/modules/etsy';
import Etsy from '../../../../shared/modules/etsy'; // TODO: Remove this when babel6 issues will be fixed
import { FIELDS } from '../../../../shared/modules/etsy/constants';
// import { WORKER } from 'global/constants'; // TODO: Uncomment this when babel6 issue will be solved
import { WORKER } from '../../../../shared/constants';

import { SHOP_SYNC_TOO_MANY_LISTINGS, SHOP_SYNC_IN_VACATION_MODE, SHOP_SYNC_NOT_FOUND, SHOP_SYNC_TOKEN_REJECTED, SHOP_SYNC_UNKNOWN_ERROR } from '../../../../shared/db/models/constants';

const invalidStates = [undefined, null, 'null', 'unavailable', 'create', 'alchemy', 'edit'];


function insertNewListingsToDb(logger, etsyListings, ourProducts, models, shopId) {
  const listingsToInsert = _.filter(etsyListings, (listing) => {
    if (invalidStates.indexOf(listing.state) >= 0) {
      logger.debug(`Exclude listing from import, invalid state: ${listing.state}`);
      logger.debug(listing);
      return false;
    }
    return _.findIndex(ourProducts, {listing_id: listing.listing_id}) === -1;
  });

  // TODO: this code has to be updated to handle big number of new listings
  const promises = _.map(listingsToInsert, (listing) => {
    return models.products.insert({ shop_id: shopId, listing_id: listing.listing_id, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: moment().unix() });
  });

  return Promise.all(promises); // Will return array of ids of new products
}

function getProductsModifiedOnHive(ourProducts, productsToDelete) {
  return _.map(_.filter(ourProducts, (product) => {
    return (
      product[FIELDS.MODIFIED_BY_HIVE] &&
      (_.findIndex(productsToDelete, product.id) === -1) &&
      product.state !== 'expired'
    );
  }), (product) => { return product.id; });
}

function getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload) {
  return _.map(_.filter(ourProducts, (product) => {
    if (productsToUpload.indexOf(product.id) !== -1) {
      return false;
    }

    const existingListing = _.find(etsyListings, { listing_id: parseInt(product.listing_id, 10) });
    if (!existingListing) { return false; }
    if (existingListing.last_modified_tsz === product[FIELDS.LAST_MODIFIED_TSZ]) { return false; }
    return true;
  }), (product) => { return product.id; });
}

// Get sections which are present in our DB and changed their title/name/section_id on Etsy
function getUpdatedSections(etsySections, ourSections) {
  return _(ourSections)
    .map(section => {
      return _.map(etsySections, (etsySection) => {
        const sameName = etsySection.name === section.value;
        const sameSectionId = etsySection.section_id === section.section_id;
        // take section_id from Etsy is they are different
        if ((sameName && !sameSectionId) || (!sameName && sameSectionId)) {
          return {
            id: section.id,
            section_id: etsySection.section_id,
            name: etsySection.name
          };
        } else {
          return undefined;
        }
      });
    })
    .flatten()
    .compact()
    .value();
}

// Get sections which present on Etsy but missing in our DB
function getNewOnEtsy(etsySections, ourSections) {
  return _.filter(etsySections, etsySection =>
    _.findIndex(ourSections, {section_id: etsySection.section_id}) === -1
  );
}

// Get sections created in Hive but missing on Etsy
function getNewInOurDb(ourSections) {
  return _(ourSections)
    .filter({ section_id: null })
    .map((section) => { return section.id; })
    .value();
}

function getProductsToDelete(etsyListings, ourProducts) {
  return _(ourProducts)
    .filter((product) => {
      return _.findIndex(etsyListings, {listing_id: parseInt(product.listing_id, 10)}) === -1;
    })
    .map((product) => {
      return product.id;
    })
    .value();
}

async function syncNewSections(config, models, logger, shop, accountProperties, manager, etsy, companyId, channelId, taskId, requests) {
  logger.info('Sync shop sections');
  // Step #1: Download sections list from etsy, get sections list from DB
  const [etsySections, sections ] = await Promise.all([
    etsy.getShopSections(accountProperties, shop.channel_shop_id, requests),
    models.sections.getSections(shop.id)
  ]);
  let ourSections = _.map(sections.ids, (id) => {
    const section = sections[id];
    return {
      id: parseInt(section.id, 10),
      shop_id: parseInt(section.shop_id, 10),
      section_id: section.section_id ? parseInt(section.section_id, 10) : section.section_id,
      value: section.value
    };
  });

  const dbPromises = [];

  // sections which are on Etsy but not in DB should be inserted to the DB
  const sectionsToUpdate = getUpdatedSections(etsySections, ourSections);
  if (! _.isEmpty(sectionsToUpdate)) {
    // update ourSections, too
    ourSections = _.map(ourSections, (ourSection) => {
      const updatedSection = _.find(sectionsToUpdate, {id: ourSection.id});
      if (updatedSection) {
        ourSection.section_id = updatedSection.section_id;
        ourSection.value = updatedSection.name;
      }
      return ourSection;
    });
  }
  _.each(sectionsToUpdate, (section) => {
    logger.debug('update section');
    logger.debug(section);
    dbPromises.push(models.sections.update(shop.id, section.id, section));
  });


  // sections which were created on Hive should be scheduled to create on Etsy
  const sectionsToInsert = getNewOnEtsy(etsySections, ourSections);
  if (! _.isEmpty(sectionsToInsert)) {
    logger.debug('sections to insert');
    logger.debug(sectionsToInsert);
    dbPromises.push(models.sections.insert(shop.id, sectionsToInsert));
  }

  await Promise.all(dbPromises);

  // create sections present in DB but not present on Etsy
  const sectionsToCreate = getNewInOurDb(ourSections);

  if (_.isEmpty(sectionsToCreate)) {
    return {};
  }
  logger.debug('Create section(s) on Etsy');
  logger.debug(sectionsToCreate);

  const createPromises = _.map(sectionsToCreate,
    (section) => manager.enqueueCreateSection(companyId, channelId, shop.id, section, taskId));

  await Promise.all(createPromises);
  // We will return number of sections as `downloadCount` to not show syncing progress which can mislead clients
  return {
    syncShopResult: {
      result: WORKER.TASK_RESULTS.SUSPENDED,
      uploadCount: 0,
      downloadCount: sectionsToCreate.length
    }
  };
}

function deleteSections(config, models, logger, shop, accountProperties, manager, etsy, requests) {
  // Step #1: Download sections list from etsy, get sections list from DB
  const getPromises = [];
  getPromises.push(etsy.getShopSections(accountProperties, shop.channel_shop_id, requests));
  getPromises.push(models.sections.getSections(shop.id));

  return Promise.all(getPromises)
    .spread((etsySections, sections) => {
      const ourSections = _.map(sections.ids, (id) => {
        const section = sections[id];
        return {
          id: parseInt(section.id, 10),
          shop_id: parseInt(section.shop_id, 10),
          section_id: section.section_id ? parseInt(section.section_id, 10) : section.section_id,
          value: section.value
        };
      });

      const sectionsToDelete = _(ourSections)
        .filter((section) => {
          if (!section.section_id) { return false; }
          return _.findIndex((etsySections), { section_id: section.section_id }) === -1;
        })
        .map((section) => section.id)
        .value();

      if (sectionsToDelete.length === 0) {
        return { result: WORKER.TASK_RESULTS.SUCCEEDED };
      }

      return models.sections.deleteByIds(shop.id, sectionsToDelete)
        .then(() => { return { result: WORKER.TASK_RESULTS.SUCCEEDED }; });
    });
}

async function getListingsAndProducts(models, shop, accountProperties, etsy, requests) {
  const [etsyProducts, dbProducts ] = await Promise.all([
    etsy.getListings(accountProperties, shop.channel_shop_id, requests),
    models.products.getStatusSummariesByShopId(shop.id)
  ]);

  return [etsyProducts, dbProducts];
}

const SHOP_REMOVAL_STATUS_CODES = [403, 404];
const OAUTH_TOKEN_REJECTED_MESSAGE = 'oauth_problem=token_rejected';
const OAUTH_TOKEN_REVOKED_MESSAGE = 'oauth_problem=token_revoked';
const SHOP_NOT_FOUND = 'Shop not found';

function containsError(errorJson, text) {
  if (!_.isObject(errorJson) || !_.isString(errorJson.message)) {
    return false;
  }
  const error = JSON.parse(errorJson.message);
  return _.includes(SHOP_REMOVAL_STATUS_CODES, error.status) && _.includes(error.text, text);
}

function removeShop(logger, models, shop) {
  logger.error({
    topic: 'shop removal',
    message: `Removing shop ${shop.name}, id:${shop.channel_shop_id}`,
    reason: `etsy returned status code in ${SHOP_REMOVAL_STATUS_CODES}`
  });
  return models.shops.deleteById(shop.id);
}

async function updateShopProperties(models, logger, shop, etsyShop) {
  logger.debug('Update shop properties');
  if (etsyShop.doRemoveShop) {
    await removeShop(logger, models, shop);
    return {
      syncShopResult: {
        result: WORKER.TASK_RESULTS.SUCCEEDED,
        deleted: true
      }
    };
  }
  if (etsyShop.name !== shop.name) {
    await models.shops.updateShopName(shop.id, etsyShop.name);
  }
  if (etsyShop.inventory !== shop.inventory) {
    await models.shops.updateShopUsesInventory(shop.id, etsyShop.inventory);
  }
  if (etsyShop.user_id !== shop.channel_user_id) {
    await models.shops.updateShopUserId(shop.id, etsyShop.user_id);
  }
  // if Etsy shop is in vacation mode, we need to update shop status
  if (etsyShop.inVacation) {
    return {
      syncShopResult: {
        result: WORKER.TASK_RESULTS.ABORTED,
        syncStatus: SHOP_SYNC_IN_VACATION_MODE,
        doNotRetry: true
      }
    };
  } else if (shop.invalid && shop.sync_status === SHOP_SYNC_IN_VACATION_MODE) {
    // shop is no longer in vacation mode, remove invalid flag
    await models.shops.resetInvalidFlag(shop.id);
  }
  return {};
}

async function updateShop(models, logger, shop, accountProperties, etsy) {
  let etsyShop;
  try {
    etsyShop = await etsy.getShop(accountProperties, shop.channel_shop_id);
  } catch (e) {
    if (containsError(e, SHOP_NOT_FOUND)) {
      return { syncShopResult: { result: WORKER.TASK_RESULTS.ABORTED, syncStatus: SHOP_SYNC_NOT_FOUND } };
    }
    if (containsError(e, OAUTH_TOKEN_REJECTED_MESSAGE)) {
      return { syncShopResult: { result: WORKER.TASK_RESULTS.ABORTED, syncStatus: SHOP_SYNC_TOKEN_REJECTED } };
    }
    etsyShop = { doRemoveShop: containsError(e, OAUTH_TOKEN_REVOKED_MESSAGE) };
    if (!etsyShop.doRemoveShop) {
      return { syncShopResult: { result: WORKER.TASK_RESULTS.FAILED, syncStatus: SHOP_SYNC_UNKNOWN_ERROR, cause: e.message } };
    }
  }
  return updateShopProperties(models, logger, shop, etsyShop, false);
}

async function updateStateOnProducts(models, etsyListings, ourProducts) {
  const listingIdToStateMap = _.reduce(etsyListings, (result, listing) => _.set(result, listing.listing_id, listing.state), {});
  const changedProducts = _.reduce(ourProducts, (result, product) => listingIdToStateMap[product.listing_id] !== product.state ? result.concat([product]) : result, []);
  if (changedProducts.length) {
    await Promise.map(changedProducts, product => {
      const state = listingIdToStateMap[product.listing_id];
      if (invalidStates.indexOf(state) !== -1) {
        return models.products.deleteByIds([product.id]);
      }
      return models.products.setState(product.id, state);
    });
  }
}

async function updateCanWriteInventoryFlag(models, etsyListings, ourProducts) {
  const listingIdToFlagMap = _.reduce(etsyListings, (result, listing) => _.set(result, listing.listing_id, listing.can_write_inventory), {});
  let changedProducts = _.reduce(ourProducts, (result, product) => listingIdToFlagMap[product.listing_id] !== product.can_write_inventory ? result.concat([product]) : result, []);
  changedProducts = _.map(changedProducts, product => {
    product.can_write_inventory = listingIdToFlagMap[product.listing_id];
    product[FIELDS.HIVE_LAST_MODIFIED_TSZ] = moment().unix();
    return product;
  });

  if (changedProducts.length) {
    const updatedProducts = _.map(changedProducts, product => _.pick(product, ['id', 'can_write_inventory', 'channel_modification_timestamp']));
    await models.products.updateProducts(updatedProducts);
  }
}

async function getProductsWithNewImages(models, logger, ids) {
  // get image data for first image to be uploaded
  const image = await models.compositeRequests.getFirstImageToUpload(ids);
  // if there is nothing to upload, process all products in parallel
  if (!image) { return ids; }
  // we found image ready for upload, process only one product which has this image associated to it
  return [image.id];
}

async function doShopSync(config, models, logger, shop, accountProperties, manager, etsy, companyId, channelId, taskId, requests) {
  logger.debug('Request list of listings');
  const [etsyListings, ourProducts] = await getListingsAndProducts(models, shop, accountProperties, etsy, requests);
  logger.debug('Got listings from etsy and our DB');

  logger.debug('Updating state on products in our DB');
  await updateStateOnProducts(models, etsyListings, ourProducts);

  logger.debug('Updating can_write_inventory flag on products in our DB');
  await updateCanWriteInventoryFlag(models, etsyListings, ourProducts);

  // if shop has too many listings fail sync
  if (etsyListings.length > config.etsy.maxListingsInShop) {
    return Promise.resolve({ result: WORKER.TASK_RESULTS.FAILED, cause: etsyListings.length, syncStatus: SHOP_SYNC_TOO_MANY_LISTINGS, doNotRetry: true });
  }

  const productsToDelete = getProductsToDelete(etsyListings, ourProducts);
  const productsToUpload = getProductsModifiedOnHive(ourProducts, productsToDelete);
  const modifiedProducts = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload);

  const updatePromises = [];
  updatePromises.push(insertNewListingsToDb(logger, etsyListings, ourProducts, models, shop.id)
    .then(modifiedProducts.concat.bind(modifiedProducts)));
  updatePromises.push(models.products.deleteByIds(productsToDelete));

  return Promise.all(updatePromises)
    .spread(async productsToDownloadAll => {
      // addProduct can return same productId for multiple listings that have the same listing_id
      const productsToDownload = _.unique(productsToDownloadAll);
      if (productsToUpload.length + productsToDownload.length <= 0) {
        logger.debug('Nothing to sync, check sections for delete');
        return deleteSections(config, models, logger, shop, accountProperties, manager, etsy, requests);
      }

      const promises = [];

      if (productsToDownload.length) {
        logger.debug(`Schedule ${productsToDownload.length} products to download.`);
        promises.push(manager.enqueueProductDownload(companyId, channelId, productsToDownload, taskId));
      }

      if (productsToUpload.length) {
        const productsToUploadWithNewImages = await getProductsWithNewImages(models, logger, productsToUpload);
        logger.debug(`Schedule ${productsToUpload.length} products to upload.`);
        if (productsToUploadWithNewImages.length !== productsToUpload.length) {
          logger.debug(`Found new images on products, uploading single product with new image(s)`);
        }
        promises.push(manager.enqueueProductUpload(companyId, channelId, productsToUploadWithNewImages, taskId));
      }

      return Promise.all(promises)
        .then(() => {
          return { result: WORKER.TASK_RESULTS.SUSPENDED, uploadCount: productsToUpload.length, downloadCount: productsToDownload.length, suspensionPoint: 'shopSyncInProgress' };
        });
    });
}

export default async (config, models, logger, shop, accountProperties, manager, requests, rateLimiter, companyId, channelId, taskId) => {
  const etsy = new Etsy(config, rateLimiter, logger);

  const updateShopResult = await updateShop(models, logger, shop, accountProperties, etsy);
  if (updateShopResult.syncShopResult) {
    return updateShopResult.syncShopResult;
  }

  const syncSectionsResult = await syncNewSections(config, models, logger, shop, accountProperties, manager, etsy, companyId, channelId, taskId, requests);
  if (syncSectionsResult.syncShopResult) {
    return syncSectionsResult.syncShopResult;
  }

  return doShopSync(config, models, logger, shop, accountProperties, manager, etsy, companyId, channelId, taskId, requests);
};
