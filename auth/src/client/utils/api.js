import noCache from 'superagent-no-cache';
import superagent from 'superagent';
import prefix from 'superagent-prefix';
import Promise from 'bluebird';
import _ from 'lodash';


// we are interested only in endAsync()
Promise.promisifyAll(superagent);

// our API uses /api/v1 prefix
const apiPrefix = prefix('/api/v1');

export const processParams = (params) => {
  const flattenedParams = {};
  if (_.isObject(params) && !_.isNull(params)) {
    // go though each param
    _.each(params, (filter, type) => {
      // if its value is string, replace multiple spaces with single one and trim the string
      if (_.isString(filter)) {
        const trimedFilter = filter.replace(/\s+/g, ' ').trim();
        if (!!trimedFilter) {
          flattenedParams[type] = trimedFilter;
        }
      // if its value is nested object (like tags, categories, etc, which are objects with values true or false
      // serialize keys which had values set to true. tags: {a:true, b:true, c:true, d:false} will result in tags: 'a,b,c'
      } else if (_.isObject(filter) && !_.isArray(filter)) {
        const values = _.chain(filter).pick(value => !!value).keys().value().join(',');
        if (values) {
          flattenedParams[type] = values;
        }
      // if its value is array, pass it as comma sepparated list
      } else if (_.isArray(filter)) {
        if (filter.length) {
          flattenedParams[type] = filter.join(',');
        }
      // default case: take value as it is
      } else if (_.isNumber(filter) || _.isBoolean(filter)) {
        flattenedParams[type] = filter;
      }
    });
  }
  // and we are done
  return flattenedParams;
};

export const APICall = (details) => {
  // input sanity check
  if (_.isEmpty(details) || !superagent[details.method] || !_.isString(details.url)) { return Promise.reject(new TypeError('Bad input data: details')); }
  // build request
  const request = superagent[details.method](details.url);
  // add prefix
  request.use(apiPrefix);
  // no chache for API calls
  request.use(noCache);
  // should append query params?
  if (details.params) {
    request.query(processParams(details.params));
  }
  // should send payload?
  if (details.payload) {
    request.send(details.payload);
  }
  // make API call and return promise
  return request.endAsync().then((result) => result.body);
};
