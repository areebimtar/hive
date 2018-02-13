import prefix from 'superagent-prefix';
import superagent from 'superagent';
import Promise from 'bluebird';
import _ from 'lodash';


// we are interested only in endAsync()
Promise.promisifyAll(superagent);

// our API uses /api/v1 prefix
const apiPrefix = prefix('https://openapi.etsy.com/v2/');

const makeTaxonomyAPICall = (url, params) => {
  // build request
  const request = superagent.get(url);
  // add prefix
  request.use(apiPrefix);
  // should append query params?
  if (params) {
    request.query(params);
  }
  // make API call and return promise
  return request.endAsync().then((result) => result.body);
};

const doBuildIdMap = (map, results) => {
  _.each(results, result => {
    map[result.id] = {
      id: result.id,
      name: result.name,
      fullPath: result.full_path_taxonomy_ids,
      categoryId: result.category_id,
      version: result.version
    };
    map = doBuildIdMap(map, result.children); // eslint-disable-line no-param-reassign
  });

  return map;
};

const doBuildTaxonomyMap = (map, results) => {
  _.each(results, result => {
    if (result.children_ids.length) {
      map[result.id] = {
        ids: result.children_ids
      };
      doBuildTaxonomyMap(map[result.id], result.children);
    }
  });

  return map;
};

const buildMap = (results) => {
  const idMap = doBuildIdMap({}, results);
  const ids = _.map(results, result => result.id);
  idMap.taxonomy = doBuildTaxonomyMap({ids}, results);
  return idMap;
};

const makeTaxonomyMap = () => {
  return makeTaxonomyAPICall('/taxonomy/seller/get', {api_key: process.env.ETSY_KEY}).then(result => {
    return buildMap(result.results);
  });
};

makeTaxonomyMap().then(map => {
  console.log(JSON.stringify(map, null, 2)); // eslint-disable-line no-console
});
