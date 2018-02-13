/*
 *    Dev tool for exploring Etsy APIs.
 *
 *    All authenticated API calls to Etsy are made using the credentials of Etsy user keysersz
 *    (the oauth token/secret were obtained from the company1 account on production- this is
 *    the etsy account associated with user1/company_id 1 on production).
 *
 *    Run this with node 6 or using babel-node:
 *
 *        node etsytest.js
 *          or
 *        babel-node etsytest.js
 *
 *
 * */


// not using import in order to allow this to run under node 6
const superagent = require('superagent');
require('superagent-oauth')(superagent);
const OAuth = require('oauth').OAuth;
const _ = require('lodash');
const moment = require('moment');
const minimist = require('minimist');
const url = require('url');

const credentials = {
  oldApi: {
    apiKey: 'vvk0635ljecl7qvlat8h6lpo',
    apiSecret: 'a3fdz078a0',
    oauthToken: '80279c5186267505fe69a592051134',
    oauthSecret: '0cfb1021b2',
    etsyShopId: 12890972  // keysersz
  },
  newApi: {
    apiKey: 'pnz8zwunhdzsap85ecnl544h',
    apiSecret: 'jkw470sbor',
    oauthToken: '736a5cc19fc68e218e3d60667d890a',
    oauthSecret: 'f834135329',
    etsyShopId: 13592733  // uooq / boonlandia

  }
};

let userValues;
let oauth;

function get(path) {
  return new Promise(function(resolve, reject) {
    superagent
      .get('https://openapi.etsy.com/v2/' + path)
      .sign(oauth, userValues.token, userValues.secret)
      .end(function (err, res) {
        err ? reject(err) : resolve(res.body);
      });
  });
}

function logResponseAsJson(response) {
  console.log(JSON.stringify(response, null, 2));
}

function logError(err) {
  console.log(err);
}

const operations = {
  user: {
    call: () => get('users/__SELF__')
  },
  shops: {
    call: () => get('users/__SELF__/shops')
  },
  drafts: {
    call: () => get(`shops/${userValues.etsyShopId}/listings/draft`)
  },
  listing: {
    call: (listingId) => get(`listings/${listingId}`),
    data: true
  },
  variations: {
    call: (listingId) => get(`listings/${listingId}/variations`),
    data: true
  },
  inventory: {
    call: (listingId) => get(`listings/${listingId}/inventory`),
    data: true
  },
  test: {
    call: () => get('shop/13592733/listings/478670019'),
    data: true
  },
  lookup: {
    call: (etsyUserId) => get(`users/${etsyUserId}/shops`)
      .then(response => {
        return {
          shopId: response.results[0].shop_id,
          shopName: response.results[0].shop_name
        };
      }),
    data: true
  }
};

const minimistArgs = {
  string: ['operation', 'data', 'raw'],
  boolean: ['inventory'],
  alias: {
    operation: 'o',
    data: 'd',
    raw: 'r',
    inventory: 'i'
  }
};

function showUsage() {
  console.log();
  console.log('**************************   etsy api tester *****************************************');
  console.log();
  console.log('Usage: ');
  console.log('    node etsytester.js [-i] [-o <operationName>] [-d <operationData>] [-r <rawEtsyApiPath>]')
  console.log();
  console.log('Use the -i flag to use the new inventory api');
  console.log();
  console.log('Must specify either -operation (-o) or -raw (-r)');
  console.log('The -data (-d) parameter is used to pass a single data value for operations that require it.');
  console.log();
  console.log('Raw example:');
  console.log('    node etsytester.js -r shops/12890972/listings/draft');
  console.log();
  console.log('Operations/Examples:');
  console.log('  user, shops, and drafts return info about the current user (hardcoded) and require no data:');
  console.log('    node etsytester.js -o user');
  console.log('    node etsytester.js -o shops');
  console.log('    node etsytester.js -o drafts');
  console.log('  listing requires the listing ID in the data parameter:');
  console.log('    node etsytester.js -o listing -d 290250559')
  console.log();
}


const parsedArgs = minimist(process.argv.slice(2), minimistArgs);
const useInventory = parsedArgs.inventory;
const operation = operations[parsedArgs.operation];
const credentialsToUse = useInventory ? credentials.newApi : credentials.oldApi;

userValues = {
  token: credentialsToUse.oauthToken,
  secret: credentialsToUse.oauthSecret,
  etsyShopId: credentialsToUse.etsyShopId
};

oauth = new OAuth('', '', credentialsToUse.apiKey, credentialsToUse.apiSecret,  '1.0A', null, 'HMAC-SHA1');


if (operation) {
  if (operation.data && !(parsedArgs.data)) {
    showUsage();
  } else {
    operation.call(parsedArgs.data).then(logResponseAsJson).catch(logError);
  }
} else if (parsedArgs.raw) {
  get(parsedArgs.raw).then(logResponseAsJson).catch(logError);
} else {
  showUsage();
}
