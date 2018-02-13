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

const Promise = require('bluebird');
const superagent = require('superagent');
const _ = require('lodash');
const TOP_LEVEL_PROPERTIES = require('./PROPERTIES.json');
const PROPERTY_SETS = require('./PROPERTY_SETS.json');
const QUALIFIERS = require('./QUALIFIERS.json');

const ETSY_API_KEY = 'vvk0635ljecl7qvlat8h6lpo';

const getPropertyOptions = (queryParams = {}) => {
  return new Promise(function makeQuery(resolve, reject) {
    superagent
      .get('https://openapi.etsy.com/v2/property_options/suggested')
      .query({ api_key: ETSY_API_KEY})
      .query(queryParams)
      .end((err, res) => {
        err ? reject(err) : resolve(res.body.results);
      });
  });
};


const extractOptionIds = (optionsArray) => {
  return _.pluck(optionsArray, 'property_option_id');
};

const logAsJson = (response) => {
  console.log(JSON.stringify(response, null, 2)); // eslint-disable-line no-console
};

// each item to fetch is an object that has the parameters to pass to etsy
// and the key to use for storing it in finalResult.suggestedOptions. First build
// out the array of these objects, then we'll iterate through it one item at a time to build out the
// data structure we want to save to file.
const itemsToFetch = [];


// first look for option sets that hang directly off of top level properties
_.forEach(_.keys(TOP_LEVEL_PROPERTIES), (propertyId) => {
  itemsToFetch.push({ params: { property_id: propertyId }, key: propertyId });
});


const addScaleOnlyItemToFetch = (qualifier, propertyId) => {
  if (qualifier.results !== null) {
    throw new Error('trying to fetch options for parent qualifier');
  }
  const qualifierPropertyId = qualifier.property_id;
  const scaleParamName = QUALIFIERS[qualifierPropertyId].param;
  _.forEach(qualifier.options, (qualifierOptionId) => {
    const params = { property_id: propertyId };
    params[scaleParamName] = qualifierOptionId;
    const item = {
      key: `${propertyId}.${qualifierOptionId}`,
      params: params
    };
    itemsToFetch.push(item);
  });
};

const addRecipientQualifiedItemToFetch = (qualifier, propertyId, recipientId) => {
  const qualifierPropertyId = qualifier.property_id;
  const scaleParamName = QUALIFIERS[qualifierPropertyId].param;
  if (scaleParamName !== 'sizing_scale') {
    throw new Error('Unexpected nested qualifier that is not a size!');
  }
  _.forEach(qualifier.options, (qualifierOptionId) => {
    const params = { property_id: propertyId, recipient_id: recipientId };
    params[scaleParamName] = qualifierOptionId;
    const item = {
      key: `${propertyId}.${recipientId}.${qualifierOptionId}`,
      params: params
    };
    itemsToFetch.push(item);
  });
};

// now add all the scale qualified options (i.e. whatever we've got in property sets.base)
_.forEach(PROPERTY_SETS.base, addScaleOnlyItemToFetch);


// finally all the custom ones (whatever we find in propertySets.propertySets
_.forEach(PROPERTY_SETS.propertySets, (qualifierSet) => {
  _.forEach(qualifierSet, (qualifier, propertyId) => {
    // some of these are 2nd tier qualifiers but some are not...
    if (qualifier.results === null) {
      addScaleOnlyItemToFetch(qualifier, propertyId);
    } else {
      _.forEach(qualifier.results, (nestedQualifier, recipientTypeId) => {
        addRecipientQualifiedItemToFetch(nestedQualifier, propertyId, recipientTypeId);
      });
    }
  });
});

const fetchAndProcess = (finalResult = {
  // hash of optionIDs to full definitions
  optionDetails: {},
  suggestedOptionLists: {}
}) => {
  if (itemsToFetch.length) {
    const item = itemsToFetch.shift();
    if (!finalResult.suggestedOptionLists[item.key]) {
      return getPropertyOptions(item.params)
        .then((options) => {
          if (options.length) {
            _.forEach(options, (optionConfiguration) => {
              finalResult.optionDetails[optionConfiguration.property_option_id] = optionConfiguration;
            });
            finalResult.suggestedOptionLists[item.key] = extractOptionIds(options);
            return finalResult;
          }
          return finalResult;
        })
        .then(fetchAndProcess.bind(null, finalResult));
    } else {
      return fetchAndProcess(finalResult);
    }
  }
  return finalResult;
};

fetchAndProcess().then((finalResult) => logAsJson(finalResult)).catch(console.error); // eslint-disable-line no-console
