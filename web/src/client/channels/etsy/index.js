import reducers from './reducers';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';
import { MENU_OP_CONTAINER_MAP } from './constants';
import getConfig from '../bulkEditProductsTable';
import { PREVIEW_OP_DEFAULTS } from './bulkEditMenuDefaults';

export default  {
  reducers,
  getBulkEditConfig: () => ({
    componentsConfig: MENU_OP_CONTAINER_MAP,
    tableConfig: getConfig(MENU_OP_CONTAINER_MAP),
    previewOperationDefaults: PREVIEW_OP_DEFAULTS,
    BULK_EDIT_OP_CONSTS
  })
};
