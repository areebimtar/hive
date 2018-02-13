import _ from 'lodash';
import { fromJS, Map } from 'immutable';
import invariant from 'invariant';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as validatePhotos from './validate/photos';

import { FIELDS } from '../constants';


const addOp = (product, op, value, noFormatting) => {
  const photos = product.get(FIELDS.PHOTOS);
  const currentValue = photos && photos.toJS && photos.toJS() || [];
  const updatedValue = value && value.toJS && value.toJS() || [];
  const hasNewValues = _.find(updatedValue, val => !!val);

  if (!_.isArray(updatedValue)) { return product; }
  let result = product;

  // format photos
  if (!noFormatting && hasNewValues) {
    result = result.set('_formattedPhotos', fromJS(_.map(currentValue, photo => ({...photo, updated: false})).concat(_.map(updatedValue, photo => ({...photo, updated: true, op: 'add'})))));
  }

  // update photos
  result = result.set(FIELDS.PHOTOS, fromJS(currentValue.concat(updatedValue).slice(0, BULK_EDIT_VALIDATIONS.PHOTOS_MAX_LENGTH)));

  return result;
};

const replaceOp = (product, op, value, noFormatting) => {
  const photos = product.get(FIELDS.PHOTOS);
  const currentValue = photos && photos.toJS && photos.toJS() || [];
  const updatedValue = value && value.toJS && value.toJS() || [];
  const hasNewValues = _.find(updatedValue, val => !!val);

  if (!_.isArray(updatedValue)) { return product; }
  let result = product;

  // format photos
  if (!noFormatting && hasNewValues) {
    const getOpClass = (updated) => updated ? 'replace' : '';
    result = result.set('_formattedPhotos', fromJS(_.map(currentValue, (photo, index) => ({...(updatedValue[index] || photo), updated: !!(photo && updatedValue[index]), op: getOpClass(!!(photo && updatedValue[index]))}))));
  }

  // update photos
  result = result.set(FIELDS.PHOTOS, fromJS(_.map(currentValue, (photo, index) => !!photo && updatedValue[index] || photo)));

  return result;
};


const deleteOp = (product, op, value, noFormatting) => {
  const photos = product.get(FIELDS.PHOTOS);
  const currentValue = photos && photos.toJS && photos.toJS() || [];
  const updatedValue = value && value.toJS && value.toJS() || [];
  const hasNewValues = _.find(updatedValue, val => !!val);

  if (!_.isArray(updatedValue)) { return product; }
  let result = product;

  // format photos
  if (!noFormatting && hasNewValues) {
    const getOpClass = (updated) => updated ? 'del' : '';
    result = result.set('_formattedPhotos', fromJS(_.map(currentValue, (photo, index) => ({...photo, updated: !!updatedValue[index], op: getOpClass(!!(photo && updatedValue[index]))}))));
  }

  // update photos
  result = result.set(FIELDS.PHOTOS, fromJS(_(currentValue).map((photo, index) => (updatedValue[index]) ? null : photo).filter(photo => !!photo).value()));

  return result;
};

const swapOp = (product, op, value, noFormatting) => {
  const _value = value && value.toJS && value.toJS();
  if (!(_value && _.isFinite(_value.sourceIdx) && _.isFinite(_value.targetIdx))) { return product; }

  let result = product;
  const photos = product.get(FIELDS.PHOTOS);
  const updatedValue = photos && photos.toJS() || [];

  const tmp = updatedValue[_value.sourceIdx];
  updatedValue[_value.sourceIdx] = updatedValue[_value.targetIdx];
  updatedValue[_value.targetIdx] = tmp;

  // format photos
  if (!noFormatting) {
    const getOpClass = (updated) => updated ? 'swap' : '';
    result = result.set('_formattedPhotos', fromJS(_.map(updatedValue, (photo, index) => ({...photo, updated: index === _value.sourceIdx || index === _value.targetIdx, op: getOpClass(index === _value.sourceIdx || index === _value.targetIdx)}))));
  }

  // update photos
  result = result.set(FIELDS.PHOTOS, fromJS(updatedValue));

  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.PHOTOS_ADD:
      result = addOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE:
      result = replaceOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.PHOTOS_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.PHOTOS_SWAP:
      result = swapOp(product, op, value, noFormatting);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // validate photos value
  const error = validatePhotos.validate(product);
  // and finally return result
  return new Map({ valid: !error, data: error });
};
