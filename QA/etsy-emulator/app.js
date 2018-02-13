/**
 * Etsy API Emulator
 */
console.log("** Starting '" + __filename + "'");

var express = require('express');
var emu_core = require('./lib/emu_core');
 

  // Express configuration
var app = express.createServer();
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));


  // test_id to run - load config with this name, directory of the config/data
var test_id      = (process.env.ETEST_TEST_ID || null); 
var test_dir     = (process.env.ETEST_TEST_DIR || './tests');

  // Base URL, listen port configuration
var scheme       = (process.env.ETEST_SCHEME || 'http');
var host         = (process.env.ETEST_HOST || '127.0.0.1');
var port         = (process.env.ETEST_PORT || 3000);
var base_path    = (process.env.ETEST_PATH || '');
app.EXT_BASE_URL = scheme + '://' + host + ':' + port + base_path;
 
  // read config <test_id>.json
var cfg = {};
if (test_id !== null) {
  console.log("** Test case:", test_id);
  cfg = emu_core.read_cfg(test_dir, test_id + '.json');
}
cfg._app = { test_dir: test_dir };

  // Initialize basic APIs
emu_core.init(app, cfg);

  // Load modules defined in the config
if ('include_modules' in cfg) {
  for (var mod of cfg.include_modules) {
    console.log("** Loading", mod);
    var tmp = require('./lib/' + mod);
    if ('init' in tmp) {
      tmp.init(app, cfg);
    }
    console.log("\t** ", mod, "loaded");
  }
}

console.log("** Listening on port", port);
app.listen(port);
