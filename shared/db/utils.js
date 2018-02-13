import _ from 'lodash';
import invariant from 'invariant';
import { LISTING_FIELD_TYPES } from '../modules/etsy/constants';


const getBaseObject = row => {
  const keys = _.keys(row).filter((key) => key !== 'property_name' && key !== 'property_value');
  return _.pick(row, keys);
};

const getPropertyValue = (obj, propertyName, value) => {
  let ret = obj[propertyName];
  // get field definition
  const fieldDefinition = _.find(LISTING_FIELD_TYPES, {name: propertyName});
  // TODO: remove Etsy specific code
  // check if it should be array or not
  switch (fieldDefinition && fieldDefinition.type) {
    case 'array':
      const val = (_.isString(value)) ? JSON.parse(value) : value;
      ret = (ret || []).concat(val);
      break;
    case 'row_set':
      ret = (ret || []).concat(value);
      break;
    default:
      ret = value;
  }

  return ret;
};

function set(object, key, value) {
  invariant(object && _.isObject(object) && _.isString(key) && key, `Cannot set property. Need valid object, key/value. Got: object=${object}; key=${key}; value=${value}`);
  // store pointer to nested objects
  let current = object;
  // get keys and last key
  const keys = key.split('.');
  const lastKey = keys.pop();
  // go through all keys until we are at last one
  let property;
  let k;
  while (keys.length) {
    k = keys.shift();
    property = current[k];
    // if we have nested object in our path, get next child object
    if (property && _.isObject(property) && !_.isArray(property)) {
      current = property;
    // if not, we create new nested object
    } else if (!property) {
      current = current[k] = {};
    } else {
      invariant(false, `Nested property is not an object. Cannot set key/value property. Got: ${property}`);
    }
  }

  // set transformed value
  current[lastKey] = getPropertyValue(current, lastKey, value);
  return object;
}

export function build(rows) {
  invariant(_.isArray(rows), `Cannot build model object. Rows must be array. Got: ${rows}`);
  const ids = [];
  const objects = {};
  let rowId;

  // goup rows and their values by id
  _.each(rows, row => {
    rowId = row.id;
    // if we do not have object stored yet
    if (!objects[rowId]) {
      // we need to create it and populate common properties
      objects[rowId] = getBaseObject(row);
      // rows could have been sorted, store ids as they come
      ids.push(rowId);
    }
    // if there are key/value pairs, we need to store them as well
    if (row.property_name) {
      // set properties (can be nested property - eg a.b.c.d will set/crete value in { a: { b: { c: { d: value }}}} )
      set(objects[rowId], row.property_name, row.property_value);
    }
  });
  return _.map(ids, id => objects[id]);
}

export function buildSingle(rows) {
  const objectsArr = build(rows);
  invariant(_.isArray(objectsArr) && objectsArr.length <= 1, `Response must be array with single object. Got: ${objectsArr}`);

  return (objectsArr.length) ? objectsArr[0] : {};
}

export function getAsArray(input) {
  if ((_.isString(input) && !input) || (_.isObject(input) && _.isEmpty(input)) || _.isUndefined(input)) { return []; }
  if (!_.isArray(input)) { return [input]; }
  return input;
}

export function camelizeKeys(object) {
  return _.mapKeys(object, (value, key) => _.camelCase(key));
}

export function snakelizeKeys(object) {
  return _.mapKeys(object, (value, key) => _.snakeCase(key));
}

export function replaceWithPostgressArrays(object) {
  return _.mapValues(object, value => _.isArray(value) ? `{${value.join(', ')}}` : value);
}

export function escapePostgresLikeQuery(query) {
  // Escapes %, \ and _ in query that is used in LIKE clause in SQL command
  return query
    .replace('\\', '\\\\')
    .replace('%', '\\%')
    .replace('_', '\\_');
}
