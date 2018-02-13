/*
Emulator core API

  Exit:
     curl http://localhost:3000/exit

  Set test case id (i.e. write it to test_id.txt) and exit:
     curl http://localhost:3000/set_test_id?test_id=tc1

  Return array of processed requests
     curl http://localhost:3000/requests

*/

var fs = require('fs');
var utils = require('./utils');
var urlCounters = require ('./url_counters');

var test_id_file = (process.env.ETEST_TEST_ID_FILE || 'test_id.txt');

var requests = [];
var ignoredUrls = [];
var coreUrls = {};

var app;
var cfg;



//--------------------------------------------------------------------------------
// Load configuration
function read_cfg(cfgDir, fName) {
  fName = cfgDir + '/' + fName;
  console.log("** Reading config file '" + fName + "'");
  var s = fs.readFileSync(fName, 'utf8');
  var mainCfg = JSON.parse(s);
  var result = {};

    // merge all included jsons
  if ('include_jsons' in mainCfg) {
    var includes = mainCfg.include_jsons.slice(0);
    for (var f of includes) {
      fName = cfgDir + '/' + f;
      s = fs.readFileSync(fName, 'utf8');
      var cfg = JSON.parse(s);
      result = utils.merge(result, cfg);
    }
  }
    // put the mainCfg on top
  result = utils.merge(result, mainCfg);
  return result;
}


//--------------------------------------------------------------------------------
// (re)create file <test_id_file> - wire value of test_id from request into it.
function set_test(req, res) {
  try { fs.unlinkSync(test_id_file); } catch (err) {/* ok */ }
  var test_id = req.query.test_id;
  if (test_id) {
     try {
      fs.accessSync(cfg._app.test_dir + '/' + test_id + '.json', fs.r_ok);
      fs.writeFileSync(test_id_file, test_id);
    } catch (err) {
      console.log('error: test not found: ', cfg._app.test_dir + '/' + test_id + '.json', err);
      return res.status(404).send('test not found: ' + test_id)
    }
  } else {
    console.log('error: test not specified in /set_test_id call');
    return res.status(404).send('no test specified')
  }
  console.log('setting testcase:', test_id);
  res.send('test case set, restarting...\n');
  setTimeout(function() {process.exit(100) }, 200);
}


//--------------------------------------------------------------------------------
// exit (the app is intended to be restarted by run-emulator script with the new test_id)
function exit_app(req, res) {
  res.send('exiting\n');
  console.log('exiting');
  setTimeout(function() {process.exit(100) }, 200);
}


//--------------------------------------------------------------------------------
// return requests array
function get_requests(req, res) {
  res.send(requests);
}



//--------------------------------------------------------------------------------
// store each request that is not in ignoredUrls in the requests array
function rememberRequest(req, res, next) {
  var base_url = req.url.match(/^[^?]*/)[0];
  if (ignoredUrls.indexOf(base_url) < 0) {
    requests.push({
      'url': req.url,
      'method': req.method,
      'headers': req.headers,
      'cookies': req.cookies,
      'body': req.body,
      'ts': (new Date()).getTime()
    });
    urlCounters.addUrl(req.method, req.url);
  }
  //console.log(req);
  next();
}


//--------------------------------------------------------------------------------
// Core API to set test case etc.
function coreApi(req, res, next) {
  var method = req.method.toUpperCase();
  if (method === 'GET') {
    for (var url in coreUrls) {
      var urlMatch = req.url.match('^' + url + '$');
      if (urlMatch !== null) {
        return coreUrls[url](req, res);
      }
    }
  }
  next();
}



//--------------------------------------------------------------------------------
// initialize module
function init(application, config) {
  app = application;
  cfg = config;

  coreUrls['/requests'] = get_requests;             ignoredUrls.push('/requests');
  coreUrls['/exit'] = exit_app,                     ignoredUrls.push('/exit');
	coreUrls['/set_test_id\\?test_id=.+'] = set_test; ignoredUrls.push('/set_test_id');

    // register urls
  console.log("** Initializing emu_core");
	app.use(rememberRequest);
	app.use(coreApi);
}


module.exports = {
  read_cfg: read_cfg,
  init: init
};


