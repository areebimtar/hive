import _ from 'lodash';
import { fromJS, Map } from 'immutable';
import invariant from 'invariant';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as tags from './validate/tags';


const addOp = (product, op, value, noFormatting) => {
  if (!_.isString(value) || !value) { return product; }

  let result = product;
  // convert comma separated tags in string into array
  // trim spaces and remove empty tags
  const tagsArr = _(value).split(',')
    .map(val => val.trim())
    .filter(val => !!val)
    .value();

  const _tags = result.get('tags');
  const currentTags = _tags && _tags.toJS() || [];

  // format tags
  // { name: 'visible tag text', status: 'tag|add|del'}
  if (!noFormatting) {
    const existingTags = _.map(currentTags, (tag) => ({name: tag, status: 'tag'}));
    const newTags = _.map(tagsArr, (tag) => ({ name: tag, status: 'add' }));
    const newTagsArray = _.uniq(existingTags.concat(newTags), (tag) => tag.name.toLowerCase()).splice(0, BULK_EDIT_VALIDATIONS.TAGS_MAX_LENGTH);
    result = result.set('_formattedTags', fromJS(newTagsArray));
  }
  // append new tags to products.tags array
  const newTagsArray = _.uniq(currentTags.concat(tagsArr), (tag) => tag.toLowerCase()).splice(0, BULK_EDIT_VALIDATIONS.TAGS_MAX_LENGTH);
  result = result.set('tags', fromJS(newTagsArray));
  // we are done, return updated product
  return result;
};

const deleteOp = (product, op, value, noFormatting) => {
  if (!_.isString(value) || !value) { return product; }

  let result = product;
  // convert comma separated tags in string into array
  // trim spaces and remove empty tags
  const tagsArr = _(value).split(',')
    .map(val => val.trim())
    .compact()
    .map(val => val.toLowerCase())
    .value();

  const _tags = result.get('tags');
  const currentTags = _tags && _tags.toJS() || [];

  // format tags
  // { name: 'visible tag text', status: 'tag|add|del'}
  if (!noFormatting) {
    result = result.set('_formattedTags', fromJS(_.map(currentTags, (tag) => ({name: tag, status: _.indexOf(tagsArr, tag.toLowerCase()) === -1 ? 'tag' : 'del'}))));
  }
  // delete tags from products.tags array
  result = result.set('tags', fromJS(_.filter(currentTags, (tag) => _.indexOf(tagsArr, tag.toLowerCase()) === -1 )));

  // we are done, return updated product
  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.TAGS_ADD:
      result = addOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.TAGS_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // get length
  const _tags = product.get('tags');
  const length = (_tags) ? _tags.toJS().length : 0;
  // compose tags remaining message
  const error = tags.validate(product);
  const validString = !error;
  // title length is valid only if lentgh is smaller then TITLE_MAX_LENGTH
  const validLength = length >= 0 && length <= BULK_EDIT_VALIDATIONS.TAGS_MAX_LENGTH;
  // how many tags are remaining
  const N = BULK_EDIT_VALIDATIONS.TAGS_MAX_LENGTH - length;
  // compose message
  const message = validString ? `${N} remaining` : error;
  // and finally return result
  return new Map({ valid: validString && validLength, data: message });
};
