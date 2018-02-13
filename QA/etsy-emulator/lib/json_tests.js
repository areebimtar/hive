var urlCounters = require ('./url_counters');

var app;
var cfg;

var rateLimitRemaining = 10000;
const DEFAULT_HEADERS = 'default_headers';
const DEFAULT_STATUS = 200;

const FUNCTIONS = {
  fixed_json: fixed_json,
  generate_listings_by_count: generate_listings_by_count,
  generate_listings_from_data: generate_listings_from_data,
  external_json: external_json,
  external_json_list: external_json_list,
  dynamic_json_list: dynamic_json_list
}

var fs = require('fs');
var utils = require('./utils');
var error = utils.error;


//--------------------------------------------------------------------------------
// send json response as defined in config,
// decrement X-RateLimit-Remaining header
function fixed_json(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = utils.merge(headers, cfg[DEFAULT_HEADERS]);
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;
  const status = data.status || DEFAULT_STATUS;
  res.status(status).send(data.body, headers);
}


//--------------------------------------------------------------------------------
// generate json response from template defined in config,
// decrement X-RateLimit-Remaining header
// the required data structure:
// {
//    "body": { "count": 123, "results": [], .... }
//    "results_template": { }
// }
// - function loops 'count' times over 'results_template', each time sets results_template.listing_id = 10000 + i;
//   and inserts the record into body.results array; the whole body is then sent to the client.
function generate_listings_by_count(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = cfg[DEFAULT_HEADERS];
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;

  var body = JSON.parse(JSON.stringify(data.body)); // deep copy
  var count = body.count;
  for (var i=1; i <= count; i++) {
    var template = JSON.parse(JSON.stringify(data.results_template));
    template.listing_id = 100000 + i;
    body.results.push(template);
  }
  const status = data.status || DEFAULT_STATUS;
  res.status(status).send(body, headers);
}



//--------------------------------------------------------------------------------
// generate json response from template defined in config,
// decrement X-RateLimit-Remaining header
// the required data structure:
// {
//    "body": { "results": [], .... }
//    "results_template": { }
//    "results_data": [ {}, ... ]
// }
// - function loops over results_data[], each time:
//    - sets results_template.listing_id = 10001 + i;
//    - patches results_template with results_data[i]
// - sets body.count = results_data.length
// - and inserts the final record into body.results array; the whole body is then sent to the client.
function generate_listings_from_data(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = cfg[DEFAULT_HEADERS];
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;

  var body = JSON.parse(JSON.stringify(data.body)); // deep copy
  body.count = data.results_data.length;

  for (var i=0; i < data.results_data.length; i++) {
    var template = JSON.parse(JSON.stringify(data.results_template));
    template.listing_id = 100001 + i;
    template = utils.merge(template, data.results_data[i]);
    body.results.push(template);
  }
  const status = data.status || DEFAULT_STATUS;
  res.status(status).send(body, headers);
}



//--------------------------------------------------------------------------------
// read json from a file (the whole file) and return it
// decrement X-RateLimit-Remaining header
//
//		"/v2/shops/1234/listings/draft": {
//			"function": "external_json",
//			"data": { "file": "listings_01_draft_list.json" }
//		}
function external_json(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = cfg[DEFAULT_HEADERS];
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;
  if (!('file' in data)) {
      return error(res, 500, "config item '<url>.data.file' is not defined");
  }
  var fileName = cfg._app.test_dir + '/' + data.file;
  console.log(`Reading external json from ${fileName}\n`);

  var urlPath = req.urlPath;

  try {
    var s = fs.readFileSync(fileName, 'utf8');
    obj = JSON.parse(s)
  } catch (err) {
    error(res, 500, "Error reading '" + fileName + "' " + err);
  }

  if (obj) {
    const status = data.status || DEFAULT_STATUS;
    res.status(status).send(obj, headers);
  }
}



//--------------------------------------------------------------------------------
// read json from a file (each line containg a JSON data)
// - get number from the request (Regex 1st group)
// - subtract 100000 from it
// - read nth line from the file and return it
// decrement X-RateLimit-Remaining header
//
//		"/v2/listings/([0-9]+)": {
//			"function": "external_json_list",
//			"data": { "file": "listings_01_active.json" }
//		}
function external_json_list(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = cfg[DEFAULT_HEADERS];
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;
  if (!('file' in data)) {
      return error(res, 500, "config item '<url>.data.file' is not defined");
  }
  var fileName = cfg._app.test_dir + '/' + data.file;
  var listing_no = cfg._app.urlMatch[1];
  var line_no = listing_no - 100000;
  console.log(`Reading external json from ${fileName}, listing_no=${listing_no}\n`);

  var urlPath = req.urlPath;


  utils.readLineX(fileName, line_no, (line, err) => {
    if (err) {
      error(res, 500, err);
    } else {
      const status = data.status || DEFAULT_STATUS;
      res.status(status).send(line, headers);
    }
  });
}

//--------------------------------------------------------------------------------
// read json from a file (each line containg a JSON data)
// - get count of the method/url combination already received on emulator
// - read nth line from the file and return it
// decrement X-RateLimit-Remaining header
//
//    "/v2/shops/1234/sections": {
//      "function": "dynamic_json_list",
//      "data": { "file": "listings_01_secdata.json" }
//    }
function dynamic_json_list(req, res, data) {
  var headers = {};
  if (DEFAULT_HEADERS in cfg) {
    headers = cfg[DEFAULT_HEADERS];
  }
  if ('headers' in data) {
    headers = utils.merge(headers, data.headers);
  }
  headers['X-RateLimit-Remaining'] = rateLimitRemaining--;
  if (!('file' in data)) {
      return error(res, 500, "config item '<url>.data.file' is not defined");
  }
  var fileName = cfg._app.test_dir + '/' + data.file;
  var line_no = urlCounters.getCount(req.method, req.url);
  console.log(`Reading external json from ${fileName}, line_no=${line_no}\n`);

  var urlPath = req.urlPath;


  utils.readLineX(fileName, line_no, (line, err) => {
    if (err) {
      error(res, 500, err);
    } else {
      const status = data.status || DEFAULT_STATUS;
      res.status(status).send(line, headers);
    }
  });
}


//--------------------------------------------------------------------------------
// Initialize module, register routes
function init(application, config) {
  app = application;
  cfg = config;

    // register URLs
	app.get(/.*/, function(req, res) { utils.processRequest(req, res, cfg, FUNCTIONS); } );
	app.put(/.*/, function(req, res) { utils.processRequest(req, res, cfg, FUNCTIONS); } );
	app.post(/.*/, function(req, res) { utils.processRequest(req, res, cfg, FUNCTIONS); } );
	app.delete(/.*/, function(req, res) { utils.processRequest(req, res, cfg, FUNCTIONS); } );
}

module.exports = {
  init: init
};

