import _ from 'lodash';
import { fromJS, Map } from 'immutable';
import invariant from 'invariant';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as materials from './validate/materials';


const addOp = (product, op, value, noFormatting) => {
  if (!_.isString(value) || !value) { return product; }

  let result = product;
  const _materials = result.get('materials');
  const __materials = _materials && _materials.toJS() || [];
  // convert comma sepparated materials in string into array
  // trim spaces and remove empty materials
  const materialsArr = _(value).split(',')
    .map(val => val.trim())
    .filter(val => !!val)
    .value();

  // format materials
  // { name: 'visible material text', status: 'material|add|del'}
  if (!noFormatting) {
    const existingMaterials = _.map(__materials, (material) => ({name: material, status: 'material'}));
    const newMaterials = _.map(materialsArr, (material) => ({ name: material, status: 'add' }));
    result = result.set('_formattedMaterials', fromJS(_.uniq(existingMaterials.concat(newMaterials), (material) => material.name.toLowerCase()).splice(0, BULK_EDIT_VALIDATIONS.MATERIALS_MAX_LENGTH)));
  }
  // append new materials to products.materials array
  result = result.set('materials', fromJS(_.uniq(__materials.concat(materialsArr), (material) => material.toLowerCase()).splice(0, BULK_EDIT_VALIDATIONS.MATERIALS_MAX_LENGTH)));
  // we are done, return updated product
  return result;
};

const deleteOp = (product, op, value, noFormatting) => {
  if (!_.isString(value) || !value) { return product; }

  let result = product;
  const _materials = result.get('materials');
  const __materials = _materials && _materials.toJS() || [];
  // convert comma sepparated materials in string into array
  // trim spaces and remove empty materials
  const materialsArr = _(value).split(',')
    .map(val => val.trim())
    .filter(val => !!val)
    .map(val => val.toLowerCase())
    .value();

  // format materials
  // { name: 'visible material text', status: 'material|add|del'}
  if (!noFormatting) {
    result = result.set('_formattedMaterials', fromJS(_.map(__materials, (material) => ({name: material, status: _.indexOf(materialsArr, material.toLowerCase()) === -1 ? 'material' : 'del'}))));
  }
  // delete materials from products.materials array
  result = result.set('materials', fromJS(_.filter(__materials, (material) => _.indexOf(materialsArr, material.toLowerCase()) === -1 )));

  // we are done, return updated product
  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.MATERIALS_ADD:
      result = addOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.MATERIALS_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // get length
  const _materials = product.get('materials');
  const __materials = _materials && _materials.toJS() || [];
  const length = __materials.length;
  // compose materials remaining message
  const error = materials.validate(product);
  const validString = !error;
  // title length is valid only if lentgh is smaller then TITLE_MAX_LENGTH
  const validLength = length >= 0 && length <= BULK_EDIT_VALIDATIONS.MATERIALS_MAX_LENGTH;
  // how many materials are remaining
  const N = BULK_EDIT_VALIDATIONS.MATERIALS_MAX_LENGTH - length;
  // compose message
  let message = error;
  if (validString) {
    message = `${N} remaining`;
  }
  // and finally return result
  return new Map({ valid: validString && validLength, data: message });
};
