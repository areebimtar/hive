import * as CONSTANTS from '../constants';
import { Reducer } from 'app/client/Reducer';
import * as Actions from 'app/client/actions';
import ACTION_CONSTANTS from 'app/client/constants/actions';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';

export function getMenu() {
  return CONSTANTS.MENU;
}

function* setProductType(reduction, productType) {
  yield (dispatch) => dispatch(Actions.BulkEdit.setOperationAndValue({
    type: BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET,
    value: productType
  }));

  return reduction
    .updateIn(['edit', 'productTypes'], productTypes => productTypes.push(productType).toSet().toList().sort());
}

function* setVendor(reduction, vendor) {
  yield (dispatch) => dispatch(Actions.BulkEdit.setOperationAndValue({
    type: BULK_EDIT_OP_CONSTS.VENDOR_SET,
    value: vendor
  }));

  return reduction
    .updateIn(['edit', 'vendors'], vendors => vendors.push(vendor).toSet().toList().sort());
}

export function addReducers(reducer) {
  return reducer.add(new Reducer('BulkEdit')
    .add(ACTION_CONSTANTS.SHOPIFY.BULKEDIT.SET_PRODUCT_TYPE, setProductType)
    .add(ACTION_CONSTANTS.SHOPIFY.BULKEDIT.SET_VENDOR, setVendor));
}
