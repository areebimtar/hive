
/* eslint-disable no-console */

// these properties are present on most taxonomies with identical
// settings. So, to normalize data we assume these are always present
// in the same form UNLESS a taxonomy specifically overrides them.
const COMMON_PROPERTIES = [200, 46803063659, 46803063641, 52047899002, 504, 501, 502, 500, 503, 505, 506, 507, 508, 509, 100, 510, 511, 512, 513, 514, 515];
const SUGGESTED_OPTIONS_FILE = 'SUGGESTED_OPTIONS_LOOKUP.json';
const SCALES_LOOKUP_FILE = 'SCALES_LOOKUP.json';
const PROPERTY_USAGE_SUMMARY_FILE = 'PROPERTY_USAGE_SUMMARY.json';
const STANDARD_PROPERTIES_FILE = 'STANDARD_PROPERTIES.json';
const TAXONOMY_SPECIFIC_PROPERTIES_FILE = 'TAXONOMY_SPECIFIC_PROPERTIES.json';

function rawFilename(taxonomyId) {
  const longIdStr = '000' + taxonomyId;
  const idStr = longIdStr.substr(longIdStr.length - 4);
  return `./cached-api-results/${idStr}.json`;
}

const superagent = require('superagent');
const minimist = require('minimist');
const _ = require('lodash');
const taxonomy = require('../../taxonomy.json');
delete taxonomy.taxonomy;
const Promise = require('bluebird');
const fs = require('fs');
const ETSY_API_KEY = 'vvk0635ljecl7qvlat8h6lpo';

// Customizer for JSON.stringify that serializes numeric arrays as a a weird string... the string
// looks like this (including the quotes)   "NUMARR[1, 2, 3]NUMARR"
// The reason for this is purely cosmetic, to make the cached files more human readable rather than having one number
// per line in the file.
function replaceNumberArrays(k, v) {
  if (_.isArray(v) && v.length && _.isNumber(v[0])) {
    return `NUMARR${v.join(', ')}NUMARR`;
  } else {
    return v;
  }
}

function jsonString(o) {
  const jsonStr = JSON.stringify(o, replaceNumberArrays, 2);
  return jsonStr.replace(/\"NUMARR/g, '[').replace(/NUMARR\"/g, ']');
}

const writeJsonFile = (path, contents) => {
  fs.writeFileSync(path, jsonString(contents));
};

function logJson(o) {
  console.log(jsonString(o));
}

function getRawDataFiles() {
  let p = Promise.resolve();
  _.forEach(taxonomy, (value, taxonomyId) => {
    p = p.then(() => {
      console.log(`Fetching ${taxonomyId} - ${value.name}`);
      return new Promise(function makeQuery(resolve, reject) {
        superagent
          .get(`https://openapi.etsy.com/v2/taxonomy/seller/${taxonomyId}/properties`)
          .query({ api_key: ETSY_API_KEY})
          .end((err, res) => {
            err ? reject(err) : resolve(res.body);
          });
      })
      .then((data) => {
        writeJsonFile(rawFilename(taxonomyId), {
          name: value.name,
          'etsy-api-result': data.results
        });
      });
    });
  });
  return p;
}

function buildOneScaleSet(taxonomyId) {
  const result = {};
  const propertyArray = require(rawFilename(taxonomyId))['etsy-api-result'];
  _.forEach(propertyArray, (rawPropertyData) => {
    const propertyId = rawPropertyData.property_id;
    if (rawPropertyData.is_multivalued !== 0 && rawPropertyData.supports_variations !== 0) {
      throw new Error('Etsy is using multivalued variation properties for taxonomy ID ' + taxonomyId);
    }

    const propertyResult = {
      name: rawPropertyData.name,
      displayName: rawPropertyData.display_name,
      required: !!rawPropertyData.is_required,
      attributes: !!rawPropertyData.supports_attributes,
      variations: !!rawPropertyData.supports_variations,
      selectedValueIds: _.pluck(rawPropertyData.selected_values, 'value_id'),
      suggestedOptionIds: _.pluck(_.filter(rawPropertyData.possible_values, { scale_id: null }), 'value_id'),
      scales: {}
    };
    result[propertyId] = propertyResult;

    // now collect the scales for the properties
    _.forEach(rawPropertyData.scales, (rawScale) => {
      if (!_.isFinite(parseInt(rawScale.scale_id, 10))) {
        console.log('bad data!');
        console.log(JSON.stringify(rawScale));
        throw new Error('Unexpected missing scale data from etsy');
      }
      const scaleId = rawScale.scale_id;

      // const scaleObject = buildScale(∂aarawScale);
      const scaleData = {
        id: scaleId,
        name: rawScale.display_name,
        description: rawScale.description,
        suggestedOptionIds: _.pluck(_.filter(rawPropertyData.possible_values, {scale_id: scaleId}), 'value_id')
      };
      propertyResult.scales[scaleId] = scaleData;
    });
  });

  return result;
}

function buildSuggestedOptionsLookup() {
  const result = {};

  _.forEach(taxonomy, (value, taxonomyId) => {
    const rawPropertyArray = require(rawFilename(taxonomyId))['etsy-api-result'];
    _.forEach(rawPropertyArray, (rawPropertyData) => {
      const propertyId = rawPropertyData.property_id;
      const allPossibleValues = _.map(rawPropertyData.possible_values, (rawPossibleValue) => {
        return {
          id: rawPossibleValue.value_id,
          name: rawPossibleValue.name,
          equalTo: rawPossibleValue.equal_to,
          forScale: rawPossibleValue.scale_id
        };
      });

      const scalesIds = _.unique(_.pluck(allPossibleValues, 'forScale'));

      const scaleOptions =  {};
      _.forEach(scalesIds, (scaleId) => {
        const options = _.remove(allPossibleValues, { forScale: scaleId });
        if (scaleId) {
          scaleOptions[scaleId] = options;
        } else {
          scaleOptions.none = options;
        }
      });

      if (allPossibleValues.length > 0) {
        throw new Error('This is a bug- we should have pulled out all the options');
      }

      if (_.keys(scaleOptions).length) {
        if (!result[propertyId]) {
          result[propertyId] = {};
        }

        _.forEach(scaleOptions, (optionsArray, scaleKey) => {
          const combinedScaleOptions = _.union(_.get(result, `${propertyId}.${scaleKey}`, []), optionsArray);
          const uniqueScaleOptions = _.unique(combinedScaleOptions, false, JSON.stringify);
          // check that we didn't get any options with same value_id and different innards
          const valueIds = _.pluck(uniqueScaleOptions, 'id');
          if (valueIds.length !== _.unique(valueIds).length) {
            logJson(result[propertyId]);
            throw new Error('Unexpected non-unique property data for property id ' + propertyId);
          }

          result[propertyId][scaleKey] = uniqueScaleOptions;
        });
      }
    });
  });

  writeJsonFile(SUGGESTED_OPTIONS_FILE, result);
}

function buildScalesLookup() {
  const result = {};

  _.forEach(taxonomy, (value, taxonomyId) => {
    const rawPropertyArray = require(rawFilename(taxonomyId))['etsy-api-result'];
    _.forEach(rawPropertyArray, (rawPropertyData) => {
      const scales = rawPropertyData.scales;
      _.forEach(scales, (scale) => {
        const id = scale.scale_id;
        const transformed = {
          id: id,
          name: scale.display_name,
          description: scale.description,
          suggestedOptionIds: _.pluck(_.filter(rawPropertyData.possible_values, {scale_id: id}), 'value_id')
        };

        if (!result[id]) {
          result[id] = transformed;
        }
      });
    });
  });

  writeJsonFile(SCALES_LOOKUP_FILE, result);
}

function buildPropertyDiff(standardScaleSet, taxonomySpecificScaleSet, scaleLookups) {
  const diff = {};
  // top level properties and selected values are a simple comparision
  _.forEach(['name', 'displayName', 'required', 'attributes', 'variations', 'selectedValueIds', 'suggestedOptionIds'], (key) => {
    if (!_.isEqual(taxonomySpecificScaleSet[key], standardScaleSet[key])) {
      diff[key] = taxonomySpecificScaleSet[key];
    }
  });

  const extraScales = _.difference(_.keys(taxonomySpecificScaleSet.scales), _.keys(standardScaleSet.scales));
  const missingScales = _.difference(_.keys(standardScaleSet.scales), _.keys(taxonomySpecificScaleSet.scales));

  if (extraScales.length) { diff.extraScales = _.map(extraScales, (scaleStr) => parseInt(scaleStr, 10)); }
  if (missingScales.length) { diff.missingScales = _.map(missingScales, (scaleStr) => parseInt(scaleStr, 10)); }

  const scaleDiffs = {};
  const matchedScaleIds = _.intersection(_.keys(standardScaleSet.scales), _.keys(taxonomySpecificScaleSet.scales));
  _.forEach(matchedScaleIds, (scaleId) => {
    const standardScaleData = scaleLookups[scaleId];
    const taxonomySpecificScaleData = taxonomySpecificScaleSet.scales[scaleId];
    if (!_.isEqual(standardScaleData, taxonomySpecificScaleData)) {
      scaleDiffs[scaleId] = {};
      _.forEach(taxonomySpecificScaleData, (value, key) => {
        if (standardScaleData[key] !== taxonomySpecificScaleData[key]) {
          scaleDiffs[scaleId][key] = value;
        }
      });
    }
  });

  if (_.keys(scaleDiffs).length) { diff.scales = scaleDiffs; }
  return _.keys(diff).length ? diff : null;
}

function buildScaleSets() {
  const standardProperties = {};
  const taxonomySpecificOverrides = {};
  const scaleLookups = require('./SCALES_LOOKUP.json');

  // const minitax = { 1: taxonomy[1], 2: taxonomy[2] };
  _.forEach(taxonomy, (value, taxonomyId) => {
    const taxonomyNodeResult = {}; // if we populate this with anything, we'll write it to the file
    const taxonomySpecificScaleSet = buildOneScaleSet(taxonomyId);

    // any common properties we haven't seen before? Add them to the standard scale set
    const unknownPropertyKeys = _.difference(_.keys(taxonomySpecificScaleSet), _.keys(standardProperties));
    _.forEach(unknownPropertyKeys, (key) => {
      standardProperties[key] = taxonomySpecificScaleSet[key];
    });

    const propertyIds = _.map(_.keys(taxonomySpecificScaleSet), (idStr) => parseInt(idStr, 10));

    const extraProperties = _.difference(propertyIds, COMMON_PROPERTIES);
    const missingProperties = _.difference(COMMON_PROPERTIES, propertyIds);

    if (extraProperties.length) {
      taxonomyNodeResult.extraProperties = extraProperties;
    }
    if (missingProperties.length) {
      taxonomyNodeResult.missingProperties = missingProperties;
    }

    // for known properties, find diffs form the base set.
    const knownPropertyKeys = _.difference(_.keys(taxonomySpecificScaleSet), unknownPropertyKeys);
    const overrides = {};
    _.forEach(knownPropertyKeys, (key) => {
      const diff = buildPropertyDiff(standardProperties[key], taxonomySpecificScaleSet[key], scaleLookups);
      if (diff) {
        overrides[key] = diff;
      }
    });
    if (_.keys(overrides).length) {
      taxonomyNodeResult.overrides = overrides;
    }

    if (_.keys(taxonomyNodeResult).length) {
      taxonomySpecificOverrides[taxonomyId] = taxonomyNodeResult;
    }
  });

  // finally reduce the scales data to just the IDs since we no longer need them for comparison
  _.forEach(standardProperties, (property) => {
    property.scaleIds = _.map(property.scales, (scaleData) => scaleData.id );
    delete property.scales;
  });

  writeJsonFile(STANDARD_PROPERTIES_FILE, standardProperties);
  writeJsonFile(TAXONOMY_SPECIFIC_PROPERTIES_FILE, taxonomySpecificOverrides);
}

function alwaysSometimesNever(currentBoolean, oldValue) {
  switch (oldValue) {
    case 'always':
      return currentBoolean ? 'always' : 'sometimes';
    case 'sometimes':
      return 'sometimes';
    case 'never':
      return currentBoolean ? 'sometimes' : 'never';
    default:
      return currentBoolean ? 'always' : 'never';
  }
}

function buildPropertiesSummary() {
  const result = {};
  let firstRun = true;
  _.forEach(taxonomy, (value, taxonomyId) => {
    const foundKeys = [];
    const propertyArray = require(rawFilename(taxonomyId))['etsy-api-result'];
    _.forEach(propertyArray, (propertyData) => {
      const propertyId = propertyData.property_id;
      foundKeys.push(propertyId);
      if (!result[propertyId]) {
        result[propertyId] = {
          id: propertyId,
          name: propertyData.name,
          displayNames: [propertyData.display_name],
          attribute: !!propertyData.supports_attributes,
          variation: !!propertyData.supports_variations,
          alwaysAvailable: firstRun
        };
      } else {
        const existingResult = result[propertyId];
        if (!_.includes(existingResult.displayNames, propertyData.display_name)) {
          existingResult.displayNames.push(propertyData.display_name);
        }
        existingResult.attribute = alwaysSometimesNever(!!propertyData.supports_attributes, existingResult.attribute);
        existingResult.variation = alwaysSometimesNever(!!propertyData.supports_variations, existingResult.variation);
      }
    });

    const missingProperties = _.difference(_.keys(result), foundKeys);
    _.forEach(missingProperties, (key) => {
      result[key].alwaysAvailable = false;
    });
    firstRun = false;
  });

  const array = _.values(result);
  writeJsonFile(PROPERTY_USAGE_SUMMARY_FILE, array);
}

const minimistArgs = {
  boolean: ['fetch', 'merge', 'props'],
  alias: {
    fetch: 'f',
    merge: 'm',
    props: 'p'
  }
};

function showUsage() {
  console.log();
  console.log('**************************   etsy data file generator *****************************************');
  console.log();
  console.log('Usage: ');
  console.log('    node dataFileGenerator.js [--fetch | -f ] [--merge | -m]');
  console.log();
  console.log('Use the -f flag to populate the files in the cached-api-results directory. These files are not checked in to source control.');
  console.log('This command makes several thousand API calls to Etsy and writes each result to a separate file in.');
  console.log('Once you\'ve got a current copy in your file system, you can use that until you feel the Etsy values may have changed.');
  console.log();
  console.log('Once those files are locally available, run this script with the -m flag to use those files to generate the merged/optimized JSON files in this directory.');
  console.log();
}

const parsedArgs = minimist(process.argv.slice(2), minimistArgs);
if (parsedArgs.fetch) {
  getRawDataFiles()
    .then(() => console.log(' *** DONE ***'))
    .catch(()=> console.error(' *** ERROR RETRIEVING DATA FILES FROM ETSY ***'));
} else if (parsedArgs.merge) {
  buildSuggestedOptionsLookup();
  buildScalesLookup();
  buildPropertiesSummary();
  buildScaleSets();
} else {
  showUsage();
}

