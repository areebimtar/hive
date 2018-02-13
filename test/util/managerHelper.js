// managerHelper -- a test helper that instead of scheduling a task, it performs it directly

import _ from 'lodash';
import * as etsyUploadProductFields from '../../worker/src/operationHandlers/etsy/uploadProductFields';
import * as etsyUploadProductOfferings from '../../worker/src/operationHandlers/etsy/uploadProductOfferings';

const managerHelper = (config, models, logger) => ({
  enqueueProductFieldsUpload: (companyId, channelId, productId) => etsyUploadProductFields.start(config, models, logger, productId),
  enqueueProductOfferingsUpload: (companyId, channelId, productId) => etsyUploadProductOfferings.start(config, models, logger, productId),
  getSubtaskResults: _.noop,
  dropAllCompletedChildren: _.noop
});

export default managerHelper;
