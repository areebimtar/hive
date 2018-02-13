/*
 * Useful common functions for test case scripts
 */

var LineByLineReader = require('line-by-line');

const FUNCTION = 'function';
const DATA = 'data';

//--------------------------------------------------------------------------------
// Print error to log and send request with the error message
function error(res, result_code, message) {
      console.log('ERROR: ', result_code, message);
      res.status(result_code).send(message + '\n');
}


//--------------------------------------------------------------------------------
// Find Method + URL-path match in config,
// on success return [funcname, data]
// on error   return [undefined, undefined, http-code, err-message]
// update cfg._app - set urlMatch to the regex match result
function findConfigSection(cfg, method, urlPath) {
  myCfg = undefined;
  var data = {};
  var urlMatch;

  if (!(method in cfg)) {
      return [undefined, undefined, 404, 'Method not supported: ' + method + ' ' + req.url];
  }

    // Find cfg section matching urlRegex
  for (var urlRegex in cfg[method]) {
    urlMatch = urlPath.match('^' + urlRegex + '$');
    if (urlMatch !== null) {
      console.log('Found config section:', urlPath, ' ->', urlRegex);
      myCfg = cfg[method][urlRegex];
      cfg._app.urlMatch = urlMatch;
      break;
    }
  }

    // URL not served
  if (myCfg === undefined) {
      return [undefined, undefined, 404, 'Route not found: ' + method + ' ' + urlPath];
  }

    // Missing function in config
  if (!(FUNCTION in myCfg)) {
    return [undefined, undefined, 500, "Item '" + FUNCTION + "' not found in config"];
  }
  if (DATA in myCfg) {
    data = myCfg[DATA];
  }
  return [myCfg[FUNCTION], data];
}



//--------------------------------------------------------------------------------
// Take the request and find matching section in cfg,
// call the configured function or send http error to the client
function processRequest(req, res, cfg, functions) {
  var urlPath = req.url.match(/^[^?]*/)[0];
  var method = req.method.toUpperCase();
  req.urlPath = urlPath;

    // Find section in cfg for current request
  var [funcName, data, errCode, errMessage] = findConfigSection(cfg, method, urlPath);
  if (!funcName) {
    console.log('errCode=', errCode);
    return error(res, errCode, errMessage);
  }

    // Call the function
  if (funcName in functions) {
    return functions[funcName](req, res, data);
  } else {
    return error(res, 500, "Configued function '" + funcName + "' is not implemented");
  }
}


//--------------------------------------------------------------------------------
// Read n'th line from a file and return it via callback
function readLineX(fileName, lineNo, callback) {
    var lr = new LineByLineReader(fileName);
    var curLine = 1;

    lr.on('error', function (err) {
        return callback(undefined, "Error reading '" + fileName + "' " + err);
    });

    var found = false;
    lr.on('line', function (line) {
        if (curLine == lineNo) {
            found = true;
            callback(line);
            lr.close()
        }
        curLine++;
    });

    lr.on('end', function () {
        if (! found) {
            callback(undefined, 'Line ' + lineNo + ' not found in ' + fileName);
        }
    });
}



//--------------------------------------------------------------------------------
// Merge helper - return dash separated types of vars items, e.g.
// varTypes([ 10, 'foo', {x:1}, [1,2,3] ])  -> 'scalar-scalar-object-array'
function varTypes(vars) {
  var myType, result = '';
  for (v of vars) {
    if ((typeof(v) === 'object') && (v instanceof Object)) {
      if (v instanceof Array) {
        myType = 'array';
      } else {
        myType = 'object';
      }
    } else {
      myType = 'scalar'
    }
    if (result !== '') { result += '-' }
    result += myType;
  }
  return result;
}

//--------------------------------------------------------------------------------
// Merge o2 and o1, return result
// - objects are merged: {a:10, b:20} + {b:30, c:40} -> {a:10, b:30, c:40}
// - arrays are merged and trucnated: [1, {a:10}, 3, 4] + [2, {b:20}] -> [2, {a:10, b:20}]
function merge(o1, o2) {
  var result;
  switch (varTypes([o1, o2])) {
    case 'object-object':
      result = {};
      for (var k in o1) if (o1.hasOwnProperty(k)) {
        result[k] = o1[k];
      }
      for (var k in o2) if (o2.hasOwnProperty(k)) {
        result[k] = merge(o1[k], o2[k]);
      }
      break;
    case 'array-array':
      result = [];
      for (var i = 0; i < o2.length; i++) {
        result[i] = merge(o1[i], o2[i]);
      }
      break;
    default:
      result = o2;
  }
  return result;
}


module.exports = {
  processRequest: processRequest,
  error, error,
  readLineX: readLineX,
  merge: merge
};

