import _ from 'lodash';
import { WORKER } from '../../../../shared/constants';
import { FIELDS, NON_PRODUCT_FIELDS_TAGS } from '../../../../shared/modules/etsy/constants';

const SUBTASKS = {
  PHOTOS: 'syncPhotos',
  ATTRIBUTES_UPDATE: 'attributesUpdate',
  ATTRIBUTES_DELETE: 'attributesDelete',
  FIELDS: 'uploadModifiedFields',
  PRODUCT_OFFERINGS: 'uploadProductOfferings'
};

const STATE = {
  NEXT: 'next',
  DONE: 'done'
};

function hasTag(properties, tag) {
  return _.includes(properties, tag);
}

function hasProductFieldsTags(changedProperties) {
  return _.reduce(changedProperties, (result, tag) => result || !hasTag(NON_PRODUCT_FIELDS_TAGS, tag), false);
}

async function syncPhotos(models, logger, product, taskId, manager, companyId, channelId) {
  logger.debug('syncPhotos');

  logger.info('Schedule photos for upload and set rank');
  await manager.enqueueRearrangeImages(companyId, channelId, product.id, taskId);
}

async function deleteAttributes(models, logger, product, taskId, manager, companyId, channelId) {
  const attributes = await models.attributes.getByProductId(product.id, true);
  const deleted = _.filter(attributes, { deleted: true });

  if (deleted.length) {
    const ids = _.pluck(deleted, 'id');
    logger.info('Schedule attributes for delete');
    logger.debug(ids);
    await manager.enqueueAttributeDelete(companyId, channelId, ids, taskId);
    return STATE.NEXT;
  }

  return STATE.DONE;
}

async function updateAttributes(models, logger, product, taskId, manager, companyId, channelId) {
  const attributes = await models.attributes.getByProductId(product.id, true);
  const modified = _.filter(attributes, { modified: true, deleted: false });

  if (modified.length) {
    const ids = _.pluck(modified, 'id');
    logger.info('Schedule attributes for upload');
    logger.debug(ids);
    await manager.enqueueAttributeUpdate(companyId, channelId, ids, taskId);
    return STATE.NEXT;
  }

  return STATE.DONE;
}

export default async (config, models, logger, manager, suspensionPoint, product, companyId, channelId, taskId) => {
  const changedProperties = product[FIELDS.CHANGED_PROPERTIES];
  // start with photos until they are done
  if (hasTag(changedProperties, FIELDS.PHOTOS)) {
    await syncPhotos(models, logger, product, taskId, manager, companyId, channelId);
    return { result: WORKER.TASK_RESULTS.SUSPENDED, suspensionPoint: SUBTASKS.PHOTOS };
  }

  if (hasTag(changedProperties, FIELDS.ATTRIBUTES) && !!product[FIELDS.CAN_WRITE_INVENTORY]) {
    const attributesSyncResult = await deleteAttributes(models, logger, product, taskId, manager, companyId, channelId);
    if (attributesSyncResult === STATE.NEXT) {
      return { result: WORKER.TASK_RESULTS.SUSPENDED, suspensionPoint: SUBTASKS.ATTRIBUTES_DELETE };
    }
  }

  // Next the main product body- important to do this before offerings if the taxonomy has
  // changed as Etsy will reject the offerings upload if the properties aren't valid for the taxonomy
  if (hasProductFieldsTags(changedProperties)) {
    await manager.enqueueProductFieldsUpload(companyId, channelId, product.id, taskId);
    return { result: WORKER.TASK_RESULTS.SUSPENDED, suspensionPoint: SUBTASKS.FIELDS };
  }

  // and the offerings
  if (hasTag(changedProperties, FIELDS.PRODUCT_OFFERINGS) && !!product[FIELDS.CAN_WRITE_INVENTORY]) {
    await manager.enqueueProductOfferingsUpload(companyId, channelId, product.id, taskId);
    return { result: WORKER.TASK_RESULTS.SUSPENDED, suspensionPoint: SUBTASKS.PRODUCT_OFFERINGS };
  }

  // and the attributes
  if (suspensionPoint !== SUBTASKS.ATTRIBUTES_UPDATE && !!product[FIELDS.CAN_WRITE_INVENTORY]) {
    const attributesSyncResult = await updateAttributes(models, logger, product, taskId, manager, companyId, channelId);
    if (attributesSyncResult === STATE.NEXT) {
      return { result: WORKER.TASK_RESULTS.SUSPENDED, suspensionPoint: SUBTASKS.ATTRIBUTES_UPDATE };
    }
  }

  // update FILEDS.LAST_MODIFIED_TSZ to null so product can be re-dowloaded again
  await models.products.setChannelModifiedToOldDate(product.id);

  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
};
