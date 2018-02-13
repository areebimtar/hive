/*
    This script is used to generate customPropertySets.json:
        node propertySetFetcher > propertySets.json

    (NOTE:  it takes a while to run, be patient... maybe 10 minutes)


    This will generate a json result that looks like this:
    {
      "base": <object>,  // the default propertySet
      "propertySets": {  // a hash of taxonomy IDs to custom property  sets. The values are unique
        "25": <object>,
        "47": <object>,
        etc...
       "aliases": {  // a hash of taxonomy IDs to other taxonomy IDs which are listed in the propertySets hash.
          "26":"25",
          "27":"25",
          etc...
       }

    The script fetches the property_set resource for every taxonomy_id found in taxonomy.json, then
    strips out non-essentials and things that can be looked up in the json lookup files. Once reduced,
    this script determines if we already have a property set with the existing data.

    Most properties have the same qualifier options. If they do, we omit them from this file.
    The first found property set that doesn't match the generic one is written to the output as propertySets[taxonomyId]. The next option
    that doesn't match the generic one is checked against all the custom ones found... if it matches one of these, then
    it's added to the aliases section, otherwise it's added to the propertySets.
 */

const superagent = require('superagent');
const _ = require('lodash');
const taxonomy = require('../../../../../web/src/client/constants/taxonomy.json');
const Promise = require('bluebird');

const ETSY_API_KEY = 'vvk0635ljecl7qvlat8h6lpo';

const get = (path, queryParams = {}) => {
  return new Promise(function makeQuery(resolve, reject) {
    superagent
      .get(`https://openapi.etsy.com/v2/${path}`)
      .query({ api_key: ETSY_API_KEY})
      .query(queryParams)
      .end((err, res) => {
        err ? reject(err) : resolve(res.body);
      });
  });
};

const logAsJson = (result) => {
  console.log(JSON.stringify(result, null, 2)); // eslint-disable-line no-console
};

const extractOneElement = (arr) => {
  if (!_.isArray(arr) || arr.length !== 1) {
    throw new Error('Unexpected format from etsy, need to update this script');
  }
  return arr[0];
};

// etsy returns lots of redundant data and puts a bunch of single values into
// 1-item arrays. We want a small file that's easy to traverse, so we clean it up/transform here
const massageData = (response) => {
  const result = {};
  _.forEach(response.results[0].qualifiers, (value, key) => {
    const qualifier = extractOneElement(value);

    // now clean up any nested sub qualifiers
    _.forEach(qualifier.results, (v, k) => {
      qualifier.results[k] = extractOneElement(v);
    });

    result[key] = qualifier;
  });
  return result;
};

const fetchPropertySet = (params) => {
  return get('property_sets', params)
    .then((result) => {
      return massageData(result, params);
    });
};

let generic = null;
const all = {
  base: null,
  propertySets: {},
  aliases: {}
};


const checkIfGeneric = (propertySet) => {
  if (_.isEqual(propertySet, generic)) {
    return true;
  } else {
    return false;
  }
};

const checkForMatch = (propertySet) => {
  let matchingId = null;
  _.forEach(all.propertySets, (ps, taxId) => {
    if (_.isEqual(ps, propertySet)) {
      matchingId = taxId;
      return false;
    }
    return true;
  });
  return matchingId;
};

const fetchGeneric = () => {
  return fetchPropertySet({taxonomy_id: 1}).then((result) => {
    generic = result;
  });
};

const fetchBase = () => {
  return fetchPropertySet({}).then((result) => {
    all.base = result;
    return result;
  });
};

const addPropertySetToAll = (propertySet, taxonomyId) => {
  if (!checkIfGeneric(propertySet)) {
    const match = checkForMatch(propertySet);
    if (match) {
      all.aliases[taxonomyId] = match;
    } else {
      all.propertySets[taxonomyId] = propertySet;
    }
  }
};


const arrayToProcess = _.keys(taxonomy);

const fetchAndProcess = () => {
  if (arrayToProcess.length) {
    const taxId = arrayToProcess.shift();
    if (taxId !== 'taxonomy') {
      return fetchPropertySet({ taxonomy_id: taxId })
        .then((result) => {
          addPropertySetToAll(result, taxId);
        })
        .then(fetchAndProcess);
    }
  }
  return undefined;
};

fetchGeneric()
  .then(fetchBase)
  .then(fetchAndProcess)
  .then(() => logAsJson(all));
