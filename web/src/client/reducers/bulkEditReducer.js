import _ from 'lodash';
import Promise from 'bluebird';
import { fromJS, List, Map, is } from 'immutable';
import Reducers, { Reducer } from '../Reducer';
import moment from 'moment';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import * as utils from '../utils';
import { APICall } from 'shared/utils/api';
import { getOfferings, getOfferingsData } from 'global/modules/etsy/utils/productOfferingsImm';
import initialState from '../initialState';
import * as BULKEDIT_CONSTANTS from 'app/client/constants/bulkEdit';
import { PAGINATION_MAX_LIMIT } from 'app/client/constants';
import { FIELDS } from 'global/modules/etsy/constants';
import * as taxonomyUtils from 'global/modules/etsy/bulkEditOps/taxonomyUtils';
import * as uiUtil from 'global/modules/etsy/attributes/taxonomyNodeProperties';
import { validateVariationsAndOfferings } from 'global/modules/etsy/bulkEditOps/validate/variationsInventory';
import { APPLY_PROGRESS_MODEL_SHORTEST_DURATION } from '../constants';
import getGUID from '../../../../shared/guid';
import { CHANNEL_NAMES } from 'global/constants';

import { getChannelById } from 'app/client/channels';

const filterProductIds = (productIds, filters) => {
  const min = filters.offset;
  const max = min + filters.limit;
  return productIds.slice(min, max);
};

const applyOp = (channelId, product, op) => {
  const productId = product.get('id');
  const shouldApply = !!op && !!op.get('products').find((id) => id === productId);
  return (shouldApply) ? utils.bulkEdit.applyOp(channelId, product, op, true) : product;
};

const applyPreviewOp = (channelId, product, op) => {
  return (op && !op.isEmpty() && product && !product.isEmpty() && product.get('_selected')) ? utils.bulkEdit.previewOp(channelId, product, op, false).set('_inBulkPreview', true) : product;
};

const applyInlineEditOp = (channelId, product, op) => {
  return (op && !op.isEmpty() && product && !product.isEmpty()) ? utils.bulkEdit.previewOp(channelId, product, op, false, true) : product;
};

const getFormattedProduct = (channelId, type, product, oldProduct = null) => {
  const formattedKey = `_formatted${_.capitalize(type)}`;
  const oldFormattedValue = oldProduct && oldProduct.get(formattedKey, null);
  if (oldFormattedValue) {
    return product.set(formattedKey, oldFormattedValue);
  }
  // format product and cache it
  const formattedValue = utils.bulkEdit.format(channelId, product, type);
  return formattedValue ? product.set(formattedKey, formattedValue) : product;
};

const shouldFormat = (channelId, type, product, oldProduct) => !utils.bulkEdit.equals(channelId, type, product, oldProduct);

const formatProducts = (channelId, type, products, oldPreviewProducts = new List()) => {
  return products.map((product, index) => getFormattedProduct(channelId, type, product, shouldFormat(channelId, type, product, oldPreviewProducts.get(index)) ? null : oldPreviewProducts.get(index)));
};

const getProducts = (channelId, products, oldPreviewProducts, previewOp, inlineEditOp, type, productsStatus) => {
  const status = productsStatus || new Map();
  const inlineEditProductId = inlineEditOp && inlineEditOp.getIn(['products', 0]);
  const res = products
    .map(product => (product.get('id') === inlineEditProductId) ? applyInlineEditOp(channelId, product, inlineEditOp) : applyPreviewOp(channelId, product, previewOp))
    .map(product => product.set('_status', utils.bulkEdit.validate(channelId, product, type).merge(status.get(product.get('id')))))
    .map((product, index) => getFormattedProduct(channelId, type, product, shouldFormat(channelId, type, product, oldPreviewProducts.get(index)) ? null : oldPreviewProducts.get(index)));
  return res;
};

const applyOpOnProducts = (channelId, products, ops, menuItem, doFormatting = true) => {
  const res = products
    .map(product => ops.reduce((result, op) => applyOp(channelId, result, op, true), product), menuItem, true)
    .map((product, index) => (doFormatting && shouldFormat(channelId, menuItem, product, products.get(index))) ? getFormattedProduct(channelId, menuItem, product) : product);
  return res;
};

const getMenuItemList = (channelId, selectedMenuItem, ops) => {
  const menu = getChannelById(channelId).reducers.bulk.getMenu();

  const hasPendingUpdates = (item) => !!ops.find(op => {
    // get prefix from op (part before .)
    const prefix = op.get('type').split('.').shift();
    // check for update
    return prefix === item.get('id');
  });

  return menu.map(item => item
      .set('selected', item.get('id') === selectedMenuItem)
      .set('pendingUpdates', hasPendingUpdates(item)));
};

const getSelectedProducts = (reduction) => {
  return reduction.getIn(['edit', 'selectedProducts'])
    .map((value, key) => !!value && !_.isNaN(parseInt(key, 10)) && key)
    .toList()
    .filter(value => !!value);
};

const processFilteredData = (reduction) => {
  const channelId = reduction.getIn(['edit', 'channelId']);
  const filters = reduction.getIn(['edit', 'filters']);
  const productsTotal = reduction.getIn(['edit', 'productsTotal']);
  const selectedProducts = reduction.getIn(['edit', 'selectedProducts']);
  const selectedMenuItem = reduction.getIn(['edit', 'selectedMenuItem']);
  const operations = reduction.getIn(['edit', 'operations']);
  const previewOperation = reduction.getIn(['edit', 'previewOperation']);
  const inlineEditOp = reduction.getIn(['edit', 'inlineEditOp']);
  const inlineEditProductId = inlineEditOp && inlineEditOp.getIn(['products', 0]);
  const productsPreviewStatus = reduction.getIn(['edit', 'productsPreviewStatus']);
  // get menu list
  const menuItemList = getMenuItemList(channelId, selectedMenuItem, operations);
  // products with applied ops and formatted values
  const products = reduction.getIn(['edit', 'products']).map(product => product.set('_selected', !!selectedProducts.get(product.get('id'))).set('_inInlineEditing', (inlineEditProductId === product.get('id')) ? inlineEditOp : false));
  // pagination
  const page = utils.getPageInfo(filters.toJS(), productsTotal);
  // selected
  const selected = getSelectedProducts(reduction).size;
  // selected all products in view?
  const selectedAllVisible = !products.find(value => !value.get('_selected'));
  // get old preview products
  const oldPreviewProducts = reduction.getIn(['edit', 'productsPreview'], new List());
  // setup preview products
  const productsPreview = getProducts(channelId, products, oldPreviewProducts, previewOperation, inlineEditOp, selectedMenuItem, productsPreviewStatus);
  // should we show sync button?
  const pendingUpdates = !operations.isEmpty();
  // and finally update state
  return reduction
    .setIn(['edit', 'page'], fromJS(page))
    .setIn(['edit', 'selectedProducts', 'selectedAllVisible'], selectedAllVisible)
    .setIn(['edit', 'selectedProducts', 'selected'], selected)
    .setIn(['edit', 'productsPreview'], productsPreview)
    .setIn(['edit', 'menuItemList'], menuItemList)
    .setIn(['edit', 'pendingUpdates'], pendingUpdates);
};

const isOpValid = (op) => {
  return op &&
    _.isString(op.type) && op.type &&
    _.isArray(op.products) && op.products.length &&
    !_.isNull(op.value) && !_.isUndefined(op.value);
};

const isOpValidImm = (op) => {
  return op &&
    _.isString(op.has('type') && op.get('type')) &&
    List.isList(op.get('products')) && op.get('products').size &&
    !_.isNull(op.get('value')) && !_.isUndefined(op.get('value'));
};

function getBulkMenuDefault(channelId, menuItem) {
  const channel = getChannelById(channelId);
  if (!channel) { return null; }

  const config = channel.getBulkEditConfig();

  return config && fromJS(config.previewOperationDefaults[menuItem]);
}

function* selectMenuItem(reduction, menuItem) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  const products = reduction.getIn(['edit', 'products']);
  const formattedProducts = formatProducts(channelId, menuItem, products);

  return processFilteredData(reduction
    .setIn(['edit', 'products'], formattedProducts)
    .setIn(['edit', 'productsPreview'], formattedProducts)
    .setIn(['edit', 'selectedMenuItem'], menuItem)
    .setIn(['edit', 'previewOperation'], getBulkMenuDefault(channelId, menuItem))
    .setIn(['edit', 'inlineEditOp'], fromJS({}))
    .deleteIn(['combined', 'form']));
}

function getProductsData(shopId, ids) {
  return Promise.all([
    // get channel data
    APICall({method: 'get', url: `/shops/${shopId}/channelData`}),
    // make an API call
    APICall({method: 'get', url: `/shops/${shopId}/products`, params: { id: ids }})
  ]).spread((channelData, productsResponse) => _.merge(productsResponse, channelData));
}

function* reloadWithCurrentFilters(reduction) {
  // get shop id
  const shopId = reduction.getIn(['edit', 'shopId'], null);
  // get product ids
  const productIds = reduction.getIn(['edit', 'productIds'], new List()).toJS();
  // get current filters
  const filters = reduction.getIn(['edit', 'filters'], new Map()).toJS();
  const ids = filterProductIds(productIds, filters);
  // const should we query product offerings
  // make an API call
  yield (dispatch) => getProductsData(shopId, ids).then(
    (response) => dispatch(Actions.BulkEdit.setFiltersSucceeded(response)),
    (error) => dispatch(Actions.BulkEdit.setFiltersFailed(error)));
  return reduction
    .setIn(['edit', 'filters'], fromJS(filters));
}

function* setFilters(reduction, newFilters) {
  // get shop id
  const shopId = reduction.getIn(['edit', 'shopId']);
  // get product ids
  const productIds = reduction.getIn(['edit', 'productIds']).toJS();
  // get current filters
  let filters = reduction.getIn(['edit', 'filters']).toJS();
  // if new filters are empty, get initial ones
  if (_.isEmpty(newFilters)) {
    filters = initialState.getIn(['edit', 'filters']).toJS();
  // otherwise replace old filters with new ones
  } else {
    filters = newFilters;
  }
  const ids = filterProductIds(productIds, filters);
  // const should we query product offerings
  // make an API call
  yield (dispatch) => getProductsData(shopId, ids).then(
    (response) => dispatch(Actions.BulkEdit.setFiltersSucceeded(response)),
    (error) => dispatch(Actions.BulkEdit.setFiltersFailed(error)));
  return reduction
    .setIn(['edit', 'filters'], fromJS(filters));
}

function* updateFilters(reduction, newFilters) {
  // get shop id
  const shopId = reduction.getIn(['edit', 'shopId']);
  // get product ids
  const productIds = reduction.getIn(['edit', 'productIds']).toJS();
  // get current filters
  const filters = { ...(reduction.getIn(['edit', 'filters']).toJS()), ...newFilters };
  // get filtered product ids
  const ids = filterProductIds(productIds, filters);
  // const should we query product offerings
  // make an API call
  yield (dispatch) => getProductsData(shopId, ids).then(
    (response) => dispatch(Actions.BulkEdit.updateFiltersSucceeded(response)),
    (error) => dispatch(Actions.BulkEdit.updateFiltersFailed(error)));
  return reduction
    .setIn(['edit', 'filters'], fromJS(filters));
}

function setDataOnStore(reduction, data) {
  return _.reduce(data, (result, value, key) => result.setIn(['edit', key], fromJS(value)), reduction);
}

function* setOrUpdateFiltersSucceeded(reduction, data) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  // products
  let products = _.map(data.products, productId => ({ ...data.productsById[productId], [FIELDS.PHOTOS]: _.map(data.productsById[productId][FIELDS.PHOTOS], photo => data.imagesById[photo]) }));

  // apply bulk operations which were not synced yet
  const ops = reduction.getIn(['edit', 'operations']);
  products = applyOpOnProducts(channelId, fromJS(products), ops);
  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);

  const formattedProducts = formatProducts(channelId, menuItem, products);
  return processFilteredData(setDataOnStore(reduction, data)
    .setIn(['edit', 'products'], formattedProducts)
    .setIn(['edit', 'productsPreview'], formattedProducts));
}

function* setOrUpdateFiltersFailed(reduction, error) {
  return reduction
    .setIn(['edit', 'productsPreview'], initialState.getIn(['edit', 'productsPreview']))
    .updateIn(['notifications', 'errors'], errors => { errors.push(error); return errors; });
}

// previous/next products
function* previousProducts(reduction, data) {
  const shouldScroll = reduction.getIn(['edit', 'page', 'showPrev']);
  // const firstRowHeight = data.rowMetrics[0].height;
  const cutedRows = data.rowMetrics.slice((-0.5 * PAGINATION_MAX_LIMIT) - 1, -1);
  const heightRemoved = _.reduce(cutedRows, (d, row) => d + row.height, 0);
  const delta = data.scrollHeight - heightRemoved - data.scrollTop;

  if (!shouldScroll) {
    return yield* utils.previousProducts(reduction, ['edit'], Actions.BulkEdit.updateFilters);
  }
  return yield* utils.previousProducts(reduction.setIn(['edit', 'tableScroll'], fromJS({direction: 'up', delta})), ['edit'], Actions.BulkEdit.updateFilters);
}

function* nextProducts(reduction, data) {
  const currentLimit = reduction.getIn(['edit', 'filters', 'limit']);
  const shouldScroll = reduction.getIn(['edit', 'page', 'showNext']) && currentLimit === PAGINATION_MAX_LIMIT;
  const cutedRows = data.rowMetrics.slice(1, (0.5 * PAGINATION_MAX_LIMIT) + 1);
  const heightRemoved = _.reduce(cutedRows, (d, row) => d + row.height, 0);
  const delta = Math.max(data.scrollTop - heightRemoved, 0);

  if (!shouldScroll) {
    return yield* utils.nextProducts(reduction, ['edit'], Actions.BulkEdit.updateFilters);
  }

  return yield* utils.nextProducts(reduction.setIn(['edit', 'tableScroll'], fromJS({direction: 'down', delta})), ['edit'], Actions.BulkEdit.updateFilters);
}

function* toggleProduct(reduction, productId) {
  // togle product selection
  const newReduction = utils.toggleProduct(reduction, ['edit'], productId);
  return processFilteredData(newReduction);
}

function* toggleAllVisibleProducts(reduction) {
  return processFilteredData(utils.toggleAllVisibleProducts(reduction, ['edit']));
}

function* setOperation(reduction, operation) {
  return processFilteredData(reduction
    .setIn(['edit', 'previewOperation', 'type'], fromJS(operation))
    .deleteIn(['edit', 'previewOperation', 'value'])
    .deleteIn(['combined', 'form']));
}

function* setValue(reduction, value) {
  return processFilteredData(reduction
    .setIn(['edit', 'previewOperation', 'value'], utils.toImmutable(value)));
}

function* setOperationAndValue(reduction, operation) {
  return processFilteredData(reduction
    .setIn(['edit', 'previewOperation'], fromJS(operation))
    .deleteIn(['combined', 'form']));
}

function getInventoryOpMeta(type, newValue, needsRecalculatedOfferings, ignoreEmptyGlobalValue) {
  // get taxonomyId and variations array
  const taxonomyId = newValue.get('taxonomyId', null);
  let variations = newValue.get('variations', new List());
  const offerings = newValue.get('offerings', new List());
  // add placeholder (empty variation) for second variation
  const canShowSecondVariation = variations.size === 1 && variations.getIn([0, 'options'], new List()).size > 0;

  if (variations.size === 0) {
    variations = variations.push(new Map({ options: new List() }));
  } else if (canShowSecondVariation) {
    variations = variations.push(new Map({ options: new List() }));
  }

  // get statuses for all tabs (needed for tab markers)
  const statuses = validateVariationsAndOfferings(variations, offerings, ignoreEmptyGlobalValue, taxonomyId);

  // gather options for UI
  const variationsStatus = statuses.getIn(['data', 0, 'data', 'variations'], new Map());
  let enhancedNewValue = newValue;
  const UiVariations = variations.map((variation, index) => {
    const scalingOptionId = variation.get('scalingOptionId') ? parseInt(variation.get('scalingOptionId'), 10) : null;
    // get UI options for variation
    let uiState = uiUtil.getUiState({ taxonomyId, propertyId: variation.get('propertyId'), scaleId: scalingOptionId, displayName: variation.get('formattedName') });
    // get errors for current settings
    const validity = !!variation.get('propertyId') ? variationsStatus.getIn([index, 'status'], null) : null;
    // set selected flag on options
    uiState = uiState.update('availableOptions', availableOptions => availableOptions
        .map(option => option.set('selected', !!option && !!variation.get('options').find(opt => opt.get('value', '').toLowerCase() === option.get('name', '').toLowerCase()))));
    // format options values
    const enhancedVariation = variation.set('options', variation.get('options').map(option => option.set('label', uiState.get('optionFormatter')(option.get('value')))));
    enhancedNewValue = enhancedNewValue.setIn(['variations', index], enhancedVariation);
    // return variation metadata (info about UI options)
    return new Map({
      key: `${enhancedVariation.get('propertyId')}.${enhancedVariation.get('scalingOptionId')}`,
      uiState: uiState,
      variation: enhancedVariation,
      validity,
      taxonomyId,
      canEnableDelete: !!variation.get('propertyId'),
      disabledPropertyId: variations.get(index === 1 ? 0 : 1) && variations.getIn([index === 1 ? 0 : 1, 'propertyId']) ? parseInt(variations.getIn([index === 1 ? 0 : 1, 'propertyId']), 10) : undefined
    });
  });

  return new Map({
    taxonomyData: new Map({
      indexes: fromJS(taxonomyUtils.getIndexes(taxonomyId)),
      values: fromJS(taxonomyUtils.getValues(taxonomyId)),
      options: fromJS(taxonomyUtils.getOptions(taxonomyId))
    }),
    variationsData: new Map({
      variations: UiVariations
    }),
    offeringsData: getOfferingsData(type, enhancedNewValue, statuses.getIn(['data', type]), needsRecalculatedOfferings),
    valid: statuses.get('valid'),
    statuses,
    value: newValue
  });
}

const setOpMetadataImm = (reduction, opType, meta, ignoreEmptyGlobalValue) => {
  const value = reduction.getIn(['edit', opType, 'value']);
  const newMeta = reduction.getIn(['edit', opType, 'meta'], new Map()).merge(meta);

  return processFilteredData(reduction
    .setIn(['edit', opType, 'meta'], newMeta)
    .mergeIn(['edit', opType, 'meta'], getInventoryOpMeta(newMeta.get('activeTab'), value, false, ignoreEmptyGlobalValue)));
};

function fixVariationsPropertyIds(newValue) {
  const CUSTOM_PROPERTY_IDS = uiUtil.getCustomPropertyIds();

  let idNext = 0;
  return newValue.update('variations', variations => variations.map(variation => {
    const shouldUpdate = !variation.get('propertyId') || CUSTOM_PROPERTY_IDS.indexOf(variation.get('propertyId')) !== -1;
    if (shouldUpdate && variation.get('isCustomProperty')) {
      return variation.set('propertyId', CUSTOM_PROPERTY_IDS[idNext++]);
    }
    return variation;
  }));
}

const optionsChanged = (oldVariationOptions, newVariationOptions) => {
  if (oldVariationOptions.size !== newVariationOptions.size) { return true; }
  for (let i = 0; i < oldVariationOptions.size; ++i) {
    const oldOptions = oldVariationOptions.get(i);
    const newOptions = newVariationOptions.get(i);
    if (oldOptions.size !== newOptions.size) { return true; }
    for (let j = 0; j < oldOptions.size; ++j) {
      const oldOption = oldOptions.get(j);
      const newOption = newOptions.get(j);
      if (oldOption.get('optionId') !== newOption.get('optionId') ||
        oldOption.get('variationId') !== newOption.get('variationId')) {
        return true;
      }
    }
  }

  return false;
};

const setInventoryOpValue = (reduction, opType, newValue, ignoreEmptyGlobalValue) => {
  const type = reduction.getIn(['edit', opType, 'meta', 'activeTab'], 0);
  let value = newValue;
  const oldValue = reduction.getIn(['edit', opType, 'value'], new Map());
  // get old options
  const oldOptions = oldValue.get('variations', new List()).map(variation => variation.get('options', new List()).map(option => new Map({ optionId: option.get('id'), variationId: variation.get('id') })));
  // handle removing variation
  const deletedVariationIndex = value.get('variations').findIndex(variation => !variation);
  if (deletedVariationIndex !== -1) {
    value = value.deleteIn(['variations', deletedVariationIndex]);
  }

  // fix custom property IDs
  value = fixVariationsPropertyIds(value);

  // set variation IDs
  value = value.update('variations', variations => variations.map(variation => !!variation.get('id') ? variation : variation.set('id', -getGUID())));
  // get new options
  const newOptions = value.get('variations', new List()).map(variation => variation.get('options', new List()).map(option => new Map({ optionId: option.get('id'), variationId: variation.get('id') })));
  // compare options
  const needsRecalculatedOfferings = optionsChanged(oldOptions, newOptions);
  if (needsRecalculatedOfferings) {
    // get offerings data and fix values on newly added options
    value = value.set('offerings', getOfferings(value, true));
  }
  return reduction
    .setIn(['edit', opType, 'value'], value)
    .mergeIn(['edit', opType, 'meta'], getInventoryOpMeta(type, value, needsRecalculatedOfferings, ignoreEmptyGlobalValue));
};

function* setPreviewOpMetadata(reduction, meta) {
  return setOpMetadataImm(reduction, 'previewOperation', meta, true);
}

function* setInventoryPreviewOpValue(reduction, newValue) {
  return processFilteredData(setInventoryOpValue(reduction, 'previewOperation', newValue, true));
}

function* setSectionOperationAndValue(reduction, operation) {
  const value = operation.value;
  const sectionsMap = reduction.getIn(['edit', 'sectionsMap']).toJS();
  // find existing section (if any)
  const existingId = _.find(sectionsMap.ids, id => sectionsMap[id].toLowerCase() === value.toLowerCase().trim());
  if (existingId) {
    // we found existing section, do not create new one, but select the existing one
    operation.value = existingId;
  } else if (!sectionsMap[value] && value !== 'none') {
    // if section is entirely new one, add it to the map (one to one mapping)
    sectionsMap.ids.push(value);
    sectionsMap[value] = value;
  }

  return processFilteredData(reduction
    .setIn(['edit', 'previewOperation'], fromJS(operation))
    .setIn(['edit', 'sectionsMap'], fromJS(sectionsMap))
    .deleteIn(['combined', 'form']));
}

function* applyPreview(reduction) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  // get preview op
  let op = reduction.getIn(['edit', 'previewOperation']);
  op = op.delete('meta');
  const products = op.get('products');
  let numberOfProducts = products && products.size;
  if (!numberOfProducts) {
    // get selected products
    const selected = reduction.getIn(['edit', 'selectedProducts']).toJS();
    // get selected products ids
    const ids = _(selected).map((value, key) => value && !_.isNaN(parseInt(key, 10)) && key).filter(value => !!value).value();
    numberOfProducts = ids.length;
    // if there are no products to which we should apply op, do nothing
    if (!ids.length) { return reduction; }
    // add ids to previe op
    op = op.set('products', ids);
  }
  // track operation type and # of edited products
  yield (dispatch) =>  dispatch(Actions.Analytics.trackEvent({ event: 'apply-bulk-edit', operation: op.get('type'), products: numberOfProducts }));
  // push preview op into op list
  const operations = reduction.getIn(['edit', 'operations']).push(op);
  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);

  // update products
  const newProducts = applyOpOnProducts(channelId, reduction.getIn(['edit', 'products']), new List([op]), menuItem);

  // update store
  return processFilteredData(reduction
    .setIn(['edit', 'products'], newProducts)
    .setIn(['edit', 'productsPreview'], newProducts)
    .setIn(['edit', 'operations'], operations)
    .setIn(['edit', 'previewOperation'], getBulkMenuDefault(channelId, menuItem))
    .deleteIn(['combined', 'form']));
}

function* setOperationAndValueAndApply(reduction, operation) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  // get preview op
  const previewOp = fromJS(operation);
  // get selected products
  const selected = reduction.getIn(['edit', 'selectedProducts']).toJS();
  // get selected products ids
  const ids = _(selected).map((value, key) => value && !_.isNaN(parseInt(key, 10)) && key).filter(value => !!value).value();
  // if there are no products to which we should apply op, do nothing
  if (!ids.length) { return reduction; }
  // add ids to previe op
  previewOp.set('products', fromJS(ids));
  // track operation type and # of edited products
  yield (dispatch) =>  dispatch(Actions.Analytics.trackEvent({ event: 'apply-bulk-edit', operation: previewOp.get('type'), products: ids.length }));
  // push preview op into op list
  const operations = reduction.getIn(['edit', 'operations']).push(previewOp);
  // get new preview op
  const newPreviewOp = fromJS({type: previewOp.get('type')});

  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);

  // update products
  const products = applyOpOnProducts(channelId, reduction.getIn(['edit', 'products']), new List([previewOp]), menuItem);

  // update store
  return processFilteredData(reduction
    .setIn(['edit', 'products'], products)
    .setIn(['edit', 'productsPreview'], products)
    .setIn(['edit', 'operations'], operations)
    .setIn(['edit', 'previewOperation'], newPreviewOp)
    .deleteIn(['combined', 'form']));
}

function* resetForm(reduction, formName) {
  const defaultValues = {
    priceForm: {
      type: 'absolute',
      value: '',
      rounding: ''
    }
  };
  return reduction
    .setIn(['combined', 'form', formName], defaultValues[formName]);
}

function getShopPath(reduction) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  const channelName = CHANNEL_NAMES[channelId];
  const shopId = reduction.getIn(['edit', 'shopId']);
  if ((!channelName) || (!shopId)) {
    return '/';
  }
  return `/${channelName}/${shopId}`;
}

function* setInlineEditOp(reduction, op) {
  const shouldScroll = reduction.getIn(['edit', 'selectedMenuItem']) === 'description';
  const productId = op.products && op.products.length === 1 && op.products[0].toString();
  const selected = reduction.getIn(['edit', 'selectedProducts', productId]);
  const previewOpValue = op.value || reduction.getIn(['edit', 'previewOperation', 'value']) || undefined;

  return processFilteredData(reduction
    .setIn(['edit', 'inlineEditOp'], fromJS({...op, value: selected ? previewOpValue : op.value}))
    .setIn(['edit', 'tableScroll'], fromJS(shouldScroll ? {productId: op.products && op.products.length === 1 && op.products[0]} : {}))
  );
}

function* setInlineEditOpValue(reduction, value) {
  return processFilteredData(reduction
    .setIn(['edit', 'inlineEditOp', 'value'], fromJS(value)));
}

function* setInlineEditOpValueAndApply(reduction, value) {
  yield (dispatch) => dispatch(Actions.BulkEdit.applyInlineEditOp());

  return reduction
    .setIn(['edit', 'inlineEditOp', 'value'], fromJS(value));
}

function* setInlineEditOpAndApply(reduction, op) {
  yield (dispatch) => dispatch(Actions.BulkEdit.applyInlineEditOp());

  return reduction
    .setIn(['edit', 'inlineEditOp'], fromJS(op));
}

function* appendInlineEditOpValue(reduction, value) {
  const valueImm = utils.toImmutable(value);
  const currentOpValue = reduction.getIn(['edit', 'inlineEditOp', 'value']);
  let newValue;
  if (!currentOpValue) {
    newValue = new List([valueImm]);
  } else {
    newValue = currentOpValue.push(valueImm);
  }

  return processFilteredData(reduction
    .setIn(['edit', 'inlineEditOp', 'value'], newValue));
}

function* setInlineEditOpImm(reduction, op) {
  const shouldScroll = reduction.getIn(['edit', 'selectedMenuItem']) === 'description';
  const productId = op.getIn(['products', 0]);
  const selected = reduction.getIn(['edit', 'selectedProducts', String(productId)]);
  const previewOpValue = op.get('value') || reduction.getIn(['edit', 'previewOperation', 'value']) || undefined;

  return processFilteredData(reduction
    .setIn(['edit', 'inlineEditOp'], op.set('value', selected ? previewOpValue : op.get('value')))
    .setIn(['edit', 'tableScroll'], shouldScroll ? new Map({productId}) : new Map()));
}

function* setInlineEditOpMetadata(reduction, meta) {
  return setOpMetadataImm(reduction, 'inlineEditOp', meta, false);
}

function* setInventoryInlineEditOpValue(reduction, newValue) {
  const result = setInventoryOpValue(reduction, 'inlineEditOp', newValue, false);
  const isValid = result.getIn(['edit', 'inlineEditOp', 'meta', 'valid'], false);
  if (isValid) {
    yield (dispatch) => dispatch(Actions.BulkEdit.applyInlineEditOp(true));
    return result;
  }
  return processFilteredData(result);
}

function* cancelInlineEditOp(reduction) {
  return processFilteredData(reduction
    .setIn(['edit', 'inlineEditOp'], fromJS({})));
}

function hasChangedProperties(oldProduct, newProduct) {
  const oldProperties = oldProduct.keySeq().toList();
  const newProperties = newProduct.keySeq().toList();
  const properties = oldProperties.concat(newProperties).toSet().toList().filter(property => (property[0] !== '_') || (_.startsWith(property, '_HIVE_')));
  return properties.reduce((result, property) => result || !is(oldProduct.get(property), newProduct.get(property)), false);
}

function isValueEmpty(value) {
  if (_.isObject(value)) { return _.isEmpty(value); }
  if (_.isNumber(value)) { return false; }
  return !value;
}

function* applyInlineEdit(reduction, keepOp = false) {
  // get preview op
  const channelId = reduction.getIn(['edit', 'channelId']);
  const selectedMenuItem = reduction.getIn(['edit', 'selectedMenuItem']);
  const inPreviewMode = !!reduction.getIn(['edit', 'previewOperation', 'type']);
  const inlineEditOp = reduction.getIn(['edit', 'inlineEditOp']);
  yield (dispatch) => dispatch(Actions.Analytics.trackEvent({event: 'apply-inline-edit', operation: inlineEditOp.get('type')}));
  let operations = reduction.getIn(['edit', 'operations']);

  // validate product
  const inlineEditOpProductId = inlineEditOp.getIn(['products', 0]);
  const oldProduct = reduction.getIn(['edit', 'products']).find(p => p.get('id') === inlineEditOpProductId);
  const newProduct = applyInlineEditOp(channelId, oldProduct, inlineEditOp);
  // validate product
  const status = utils.bulkEdit.validate(channelId, newProduct, selectedMenuItem);
  if (!status.get('valid') || (!hasChangedProperties(oldProduct, newProduct) && !keepOp)) {
    yield (dispatch) => dispatch(Actions.BulkEdit.cancelInlineEditOp());
    return processFilteredData(reduction);
  }

  if (isOpValidImm(inlineEditOp)) {
    // push preview op into op list
    operations = operations.push(inlineEditOp);
  }

  const updateSelection = (currentState) => !inPreviewMode ? currentState : currentState && isValueEmpty(inlineEditOp.get('value'));

  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);
  // update products
  const products = applyOpOnProducts(channelId, reduction.getIn(['edit', 'products']), new List([inlineEditOp]), menuItem);

  // update store
  return processFilteredData(reduction
    .setIn(['edit', 'products'], products)
    .setIn(['edit', 'productsPreview'], products)
    .setIn(['edit', 'operations'], operations)
    .setIn(['edit', 'inlineEditOp'], keepOp ? inlineEditOp : fromJS({}))
    .updateIn(['edit', 'selectedProducts', inlineEditOp.getIn(['products', 0])], updateSelection));
}

function* addOp(reduction, op) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  let operations = reduction.getIn(['edit', 'operations']);
  if (isOpValid(op)) {
    // push preview op into op list
    operations = operations.push(fromJS(op));
  }

  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);
  // update products
  const products = applyOpOnProducts(channelId, reduction.getIn(['edit', 'products']), new List([fromJS(op)]), menuItem);

  // update store
  return processFilteredData(reduction
    .setIn(['edit', 'products'], products)
    .setIn(['edit', 'productsPreview'], products)
    .setIn(['edit', 'operations'], operations));
}

function* setPhotosOp(reduction, op) {
  const channelId = reduction.getIn(['edit', 'channelId']);
  let operations = reduction.getIn(['edit', 'operations']);
  if (isOpValid(op)) {
    // push preview op into op list
    operations = operations.push(fromJS(op));
  }

  // get menuItem
  const menuItem = reduction.getIn(['edit', 'selectedMenuItem']);
  // update products
  const products = applyOpOnProducts(channelId, reduction.getIn(['edit', 'products']), new List([fromJS(op)]), menuItem);
  // update store
  return processFilteredData(reduction
    .setIn(['edit', 'products'], products)
    .setIn(['edit', 'productsPreview'], products)
    .setIn(['edit', 'operations'], operations));
}

function* closeBulkEdit(reduction) {
  const pendingUpdates = reduction.getIn(['edit', 'pendingUpdates']);

  if (pendingUpdates) {
    return reduction
      .setIn(['edit', 'closeModalOpen'], true);
  }
  yield dispatch => dispatch(Actions.Application.changeRoute(getShopPath(reduction)));
  return reduction
    .setIn(['edit', 'previewOperation'], initialState.getIn(['edit', 'previewOperation']))
    .setIn(['edit', 'selectedMenuItem'], initialState.getIn(['edit', 'selectedMenuItem']));
}

function* syncPendingChanges(reduction, closeBulkEditModal) {
  const uploadingImage = reduction.getIn(['edit', 'uploadingImage'], new Map());
  const stillUploadingImages = uploadingImage.reduce((result, value) => result || value);
  if (stillUploadingImages) {
    yield dispatch => setTimeout(() => dispatch(Actions.BulkEdit.syncPendingChanges()), 200);
    return reduction.setIn(['edit', 'uploadingImages'], true);
  }

  const shopId = reduction.getIn(['edit', 'shopId']);
  const operations = reduction.getIn(['edit', 'operations']).toJS();

  const distinctOperations = _.unique(_.pluck(operations, 'type'));
  const productCount = _.union(...(_.pluck(operations, 'products'))).length;
  yield (dispatch) => dispatch(Actions.Analytics.trackEvent({ event: 'sync-triggered', products: productCount, operations: distinctOperations}));

  yield dispatch => dispatch(Actions.Application.rescheduleShopsPoll());

  yield dispatch => APICall({method: 'put', url: `/shops/${shopId}/products`, payload: operations})
    .then(() => dispatch(Actions.BulkEdit.clearApplyOperationsInProgress()))
    .catch(error => dispatch(Actions.BulkEdit.syncPendingChangesFailed(error)));

  // Show the apply progress modal
  yield dispatch => dispatch(Actions.BulkEdit.setApplyProgressModalShown(true));
  return reduction
    .setIn(['edit', 'syncUpdates', 'closeBulkEditModal'], closeBulkEditModal)
    .setIn(['edit', 'operations'], fromJS([]))
    .setIn(['edit', 'productsPreview'], fromJS([]))
    .setIn(['shopView', 'selectedProducts'], fromJS({}))
    .setIn(['edit', 'applyOperationsInProgress'], true)
    .setIn(['edit', 'uploadingImages'], false);
}

function* clearApplyOperationsInProgress(reduction) {
  // schedule sync waching period
  yield dispatch => dispatch(Actions.BulkEdit.syncPendingChangesStarted());

  return reduction
    .setIn(['edit', 'applyOperationsInProgress'], false);
}

function* syncPendingChangesStarted(reduction) {
  yield dispatch => dispatch(Actions.Application.scheduleSyncFlagClearing());

  return reduction
    .setIn(['edit', 'pendingUpdatesInProgress'], true);
}

function* syncPendingChangesFailed(reduction, error) {
  return reduction
    .setIn(['edit', 'pendingUpdatesInProgress'], false)
    .updateIn(['notifications', 'errors'], errors => { errors.push(error); return errors; });
}

function* closeModal(reduction, reason) {
  switch (reason) {
    case BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.CLOSE:
      yield dispatch => dispatch(Actions.Application.changeRoute(getShopPath(reduction)));
      return reduction
        .setIn(['edit', 'closeModalOpen'], false)
        .setIn(['edit', 'operations'], fromJS([]))
        .setIn(['edit', 'products'], fromJS([]))
        .setIn(['edit', 'productsPreview'], fromJS([]))
        .setIn(['edit', 'previewOperation'], initialState.getIn(['edit', 'previewOperation']))
        .setIn(['edit', 'selectedMenuItem'], initialState.getIn(['edit', 'selectedMenuItem']));
    case BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.KEEP_EDITING:
      return reduction
        .setIn(['edit', 'closeModalOpen'], false);
    case BULKEDIT_CONSTANTS.CLOSE_MODAL_CONSTS.SYNC_UPDATES:
      yield (dispatch) => dispatch(Actions.BulkEdit.syncPendingChanges(true));
      return reduction
        .setIn(['edit', 'closeModalOpen'], false)
        .setIn(['edit', 'productsPreview'], fromJS([]))
        .setIn(['edit', 'previewOperation'], initialState.getIn(['edit', 'previewOperation']))
        .setIn(['edit', 'selectedMenuItem'], initialState.getIn(['edit', 'selectedMenuItem']));
    default:
      return reduction;
  }
}

function* setCarouselData(reduction, carouselData) {
  return reduction.setIn(['edit', 'photosCarousel'], fromJS(carouselData));
}

function* uploadImage(reduction, imageData) {
  const data = imageData.data;
  delete imageData.data;

  yield async dispatch => {
    try {
      // get signed upload image url
      const urlData = await APICall({
        method: 'get',
        url: `/images/uploadURL`,
        params: {
          hash: imageData.hash,
          mime: imageData.mime
        }
      });

      if (urlData.uploadUrl) {
        // upload image to signed url
        await APICall({
          method: 'put',
          url: urlData.uploadUrl,
          payload: data,
          headers: { 'Content-Type': imageData.mime }
        });
      }

      dispatch(Actions.BulkEdit.uploadImageSucceeded(imageData.hash));
    } catch (error) {
      dispatch(Actions.BulkEdit.uploadImageFailed({ hash: imageData.hash, error }));
    }
  };

  return reduction.setIn(['edit', 'uploadingImage', imageData.hash], true);
}

function* uploadImageSucceeded(reduction, imageHash) {
  return reduction.setIn(['edit', 'uploadingImage', imageHash], false);
}

function* uploadImageFailed(reduction, data) {
  return reduction
    .setIn(['edit', 'uploadingImage', data.hash], false)
    .updateIn(['notifications', 'errors'], errors => { errors.push(data.error); return errors; });
}

function* setProductPreviewStatus(reduction, status) {
  const dataImm = fromJS(status.data);
  return processFilteredData(reduction
    .updateIn(['edit', 'productsPreviewStatus', status.id], value => value && value.mergeDeep(dataImm) || dataImm));
}

function* clearTableBodyScrollPosition(reduction) {
  const tableScroll = reduction.getIn(['edit', 'tableScroll']);
  if (!tableScroll) { return reduction; }

  return reduction.deleteIn(['edit', 'tableScroll']);
}

function* setApplyProgressModalShown(reduction, shown) {
  if (shown) {
    // Reset the dialog progress when showing it
    yield dispatch => dispatch(Actions.BulkEdit.setApplyProgressModalProgress({ progress: 0, total: 0 }));
  }
  let state = reduction;
  if (shown) {
    state = state.setIn(['edit', 'applyProgressModal', 'shownAt'], moment().valueOf());
    state = state.setIn(['edit', 'applyProgressModal', 'shown'], true);
  } else {
    const shownAt = state.getIn(['edit', 'applyProgressModal', 'shownAt']);
    if (moment(shownAt).add(APPLY_PROGRESS_MODEL_SHORTEST_DURATION, 'ms').isBefore(moment())) {
      state = state.setIn(['edit', 'applyProgressModal', 'shown'], false);

      const closeBulkEditModal = reduction.getIn(['edit', 'syncUpdates', 'closeBulkEditModal']);
      if (closeBulkEditModal) {
        yield dispatch => dispatch(Actions.Application.changeRoute(getShopPath(reduction)));
      }

      yield dispatch => dispatch(Actions.BulkEdit.reloadWithCurrentFilters());
    }
  }
  return state;
}

function* setApplyProgressModalProgress(reduction, { progress, total }) {
  return reduction.setIn(['edit', 'applyProgressModal', 'progress'], progress)
    .setIn(['edit', 'applyProgressModal', 'total'], total);
}

// register reducers
Reducers.add(new Reducer('BulkEdit')
  .add(CONSTANTS.BULKEDIT.SELECT_MENU_ITEM, selectMenuItem)
  .add(CONSTANTS.BULKEDIT.RELOAD_WITH_CURRENT_FILTERS, reloadWithCurrentFilters)
  .add(CONSTANTS.BULKEDIT.SET_FILTERS, setFilters)
  .add(CONSTANTS.BULKEDIT.SET_FILTERS_SUCCEEDED, setOrUpdateFiltersSucceeded)
  .add(CONSTANTS.BULKEDIT.SET_FILTERS_FAILED, setOrUpdateFiltersFailed)
  .add(CONSTANTS.BULKEDIT.UPDATE_FILTERS, updateFilters)
  .add(CONSTANTS.BULKEDIT.UPDATE_FILTERS_SUCCEEDED, setOrUpdateFiltersSucceeded)
  .add(CONSTANTS.BULKEDIT.UPDATE_FILTERS_FAILED, setOrUpdateFiltersFailed)

  .add(CONSTANTS.BULKEDIT.PREVIOUS_PRODUCTS, previousProducts)
  .add(CONSTANTS.BULKEDIT.NEXT_PRODUCTS, nextProducts)

  .add(CONSTANTS.BULKEDIT.TOGGLE_ALL_VISIBLE_PRODUCTS, toggleAllVisibleProducts)
  .add(CONSTANTS.BULKEDIT.TOGGLE_PRODUCT, toggleProduct)

  .add(CONSTANTS.BULKEDIT.SET_OPERATION, setOperation)
  .add(CONSTANTS.BULKEDIT.SET_VALUE, setValue)
  .add(CONSTANTS.BULKEDIT.SET_OPERATION_AND_VALUE, setOperationAndValue)
  .add(CONSTANTS.BULKEDIT.SET_OPERATION_AND_VALUE_AND_APPLY, setOperationAndValueAndApply)
  .add(CONSTANTS.BULKEDIT.SET_SECTION_OPERATION_AND_VALUE, setSectionOperationAndValue)
  .add(CONSTANTS.BULKEDIT.APPLY_PREVIEW_OP, applyPreview)
  .add(CONSTANTS.BULKEDIT.SET_PREVIEW_OP_METADATA, setPreviewOpMetadata)
  .add(CONSTANTS.BULKEDIT.SET_INVENTORY_PREVIEW_OP_VALUE, setInventoryPreviewOpValue)

  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP, setInlineEditOp)
  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP_IMM, setInlineEditOpImm)
  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP_VALUE, setInlineEditOpValue)
  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP_VALUE_AND_APPLY, setInlineEditOpValueAndApply)
  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP_AND_APPLY, setInlineEditOpAndApply)
  .add(CONSTANTS.BULKEDIT.SET_INLINE_EDIT_OP_METADATA, setInlineEditOpMetadata)
  .add(CONSTANTS.BULKEDIT.SET_INVENTORY_INLINE_EDIT_OP_VALUE, setInventoryInlineEditOpValue)

  .add(CONSTANTS.BULKEDIT.APPEND_INLINE_EDIT_OP_VALUE, appendInlineEditOpValue)
  .add(CONSTANTS.BULKEDIT.CANCEL_INLINE_EDIT_OP, cancelInlineEditOp)
  .add(CONSTANTS.BULKEDIT.APPLY_INLINE_EDIT_OP, applyInlineEdit)
  .add(CONSTANTS.BULKEDIT.ADD_OP, addOp)
  .add(CONSTANTS.BULKEDIT.SET_PHOTOS_OP, setPhotosOp)

  .add(CONSTANTS.BULKEDIT.RESET_FORM, resetForm)

  .add(CONSTANTS.BULKEDIT.SYNC_PENDING_CHANGES, syncPendingChanges)
  .add(CONSTANTS.BULKEDIT.SYNC_PENDING_CHANGES_STARTED, syncPendingChangesStarted)
  .add(CONSTANTS.BULKEDIT.SYNC_PENDING_CHANGES_FAILED, syncPendingChangesFailed)
  .add(CONSTANTS.BULKEDIT.CLEAR_APPLY_OPERATIONS_IN_PROGRESS, clearApplyOperationsInProgress)

  .add(CONSTANTS.BULKEDIT.CLOSE_BULK_EDIT, closeBulkEdit)
  .add(CONSTANTS.BULKEDIT.CLOSE_MODAL, closeModal)

  .add(CONSTANTS.BULKEDIT.SET_CAROUSEL_DATA, setCarouselData)
  .add(CONSTANTS.BULKEDIT.UPLOAD_IMAGE, uploadImage)
  .add(CONSTANTS.BULKEDIT.UPLOAD_IMAGE_SUCCEEDED, uploadImageSucceeded)
  .add(CONSTANTS.BULKEDIT.UPLOAD_IMAGE_FAILED, uploadImageFailed)

  .add(CONSTANTS.BULKEDIT.SET_PRODUCT_PREVIEW_STATUS, setProductPreviewStatus)

  .add(CONSTANTS.BULKEDIT.CLEAR_TABLE_BODY_SCROLL_POSITION, clearTableBodyScrollPosition)

  .add(CONSTANTS.BULKEDIT.SET_APPLY_PROGRESS_MODAL_SHOWN, setApplyProgressModalShown)
  .add(CONSTANTS.BULKEDIT.SET_APPLY_PROGRESS_MODAL_PROGRESS, setApplyProgressModalProgress)
);
