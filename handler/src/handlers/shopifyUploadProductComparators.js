import _ from 'lodash';
import { FIELDS } from 'global/modules/shopify/constants';
import S from 'string';

function tagsComparator(left, right) {
  if (left.length !== right.length) { return false; }

  const leftMap = _.reduce(left, (result, tag) => _.set(result, tag, true), {});
  return _.reduce(right, (result, tag) => result && !!leftMap[tag], true);
}

function htmlComparator(left, right) {
  return S(left).stripTags().s === S(right).stripTags().s;
}

function photosComparator(left, right) {
  return left.length === right.length;
}

function defaultComparator(left, right) {
  return _.isEqual(left, right);
}

const comparators = {
  [FIELDS.TAGS]: tagsComparator,
  [FIELDS.BODY_HTML]: htmlComparator,
  [FIELDS.PHOTOS]: photosComparator,
  default: defaultComparator
};

export function isResponseValid(request, response) {
  return _.reduce(request, (result, value, property) => {
    const comparator = _.get(comparators, property, comparators.default);
    return result && comparator(value, response[property]);
  }, true);
}
