import _ from 'lodash';
import invariant from 'invariant';
import Promise from 'bluebird';

const DENORM_MODELS = ['accounts', 'channels', 'shops'];

const is = (denorm, what) => {
  return (!what || !denorm) ? false : denorm.toLowerCase() === what.toLowerCase();
};

const getDenormProps = (denormString = '', inputs) => {
  // if denorm string is empty or set to false, there is nothing to denormalize
  if (is(denormString, 'false') || !denormString) { return []; }
  // get possible keys to denorm
  const input = (_.isArray(inputs)) ? inputs[0] : inputs;
  const propKeys = _.chain(input)
    .keys()
    .map(key => key.toLowerCase())
    .filter(key => {
      const postfix = key.slice(-3);
      if (postfix === '_id') {
        const modelName = `${key.slice(0, -3)}s`;
        return DENORM_MODELS.indexOf(modelName) !== -1;
      }
      return false;
    }).value();
  // if we should denorm all props, we are done
  if (is(denormString, 'true')) { return propKeys; }
  // filter property keys with suplied denorm keys
  const denormKeys = denormString.toLowerCase().split(',');
  return _.filter(propKeys, key => denormKeys.indexOf(`${key.slice(0, -3)}s`) !== -1 );
};

const getDenormIds = (input, propName) => {
  // get array of models (even if it has only one model)
  const models = (_.isArray(input)) ? input : [input];
  // get sorted ids
  const ids = _.map(models, model => parseInt(model[propName], 10)).sort();
  // return only unique ids
  return _.unique(ids, true);
};

// takes objects array and creates JSON as:
// {
//   _namespace_ById: {
//     id1: { ... },
//     id2: { ... },
//     id3: { ... }
//   },
//   _namespace_: [ id1, id2, id3 ]
// }
export const normalize = (namesapce, objectsArr) => {
  invariant(_.isArray(objectsArr) && _.isString(namesapce) && namesapce, `Cannot normalize resopnse. Objects array and namespace must be provided. Got: objectsArr = ${objectsArr}; namesapce=${namesapce}`);
  // get key
  const valuesKey = namesapce + 'ById';
  // build result object
  const result = {};
  // ids
  result[namesapce] = _.map(objectsArr, object => parseInt(object.id, 10)).sort((left, right) => left - right);
  // object map
  result[valuesKey] = _.reduce(objectsArr, (res, object) => { res[object.id] = object; return res; }, {});
  // and finally return normalized data
  return result;
};

export const normalizePartially = (namesapce, objectsArr) => {
  // normalize data
  const normalized = normalize(namesapce, objectsArr);
  // but remove array of ids
  delete normalized[namesapce];
  // and finally return data
  return normalized;
};

// return promise which resolves in denormalized data
export const denorm = (models, denormString, input) => {
  invariant(!_.isEmpty(models), _.isArray(input) && _.isString(denormString) && denormString, `Cannot denormalize resopnse. Models, denorm string and input array must be provided. Got: models=${models}; denormString=${denormString}; input=${input}`);
  const promises = [];
  // get properties which should be denormalized
  const denormProps = getDenormProps(denormString, input, models);
  _.each(denormProps, prop => {
    // get model name (strip '_id' from prop and append 's' eg 'account_id' -> 'accounts')
    const modelName = `${prop.slice(0, -3)}s`;
    // check if we have model for this prop
    invariant(models[modelName], `There is no such model. Got models=${models}; prop=${prop}`);
    // get unique ids
    const ids = getDenormIds(input, prop);
    // push promise into array. response will be partially normalized
    promises.push(models[modelName].getByIds(ids).then(normalizePartially.bind(null, modelName)));
  });
  // and finally return denorms (if there are any)
  return Promise.all(promises);
};

export const getAsArray = (input) => {
  if ((_.isString(input) && !input) || (_.isObject(input) && _.isEmpty(input)) || _.isUndefined(input)) { return []; }
  if (!_.isArray(input)) { return [input]; }
  return input;
};

export const exceptionWrapper = handler => (req, res) => handler(req, res).catch(err => res.json({error: err.message}));

export const now = () => {
  const time = process.hrtime();
  return (time[0] * 1e9 + time[1]) / 1e6;
};

export const asyncExceptionWrapper = handler => async (req, res, ...args) => {
  try {
    await handler(req, res, ...args);
  } catch (err) {
    res.status(500);
    if (err && err.message) {
      res.json({ error: err.message });
    } else {
      res.send();
    }
  }
};
