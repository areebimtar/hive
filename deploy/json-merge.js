// JSON merge utility.
// Roman Kaspar <roman@salsitasoft.com>
//
// no dependencies, no build required
//
// usage: node json-merge [file1] < [patch] > [file2]
//
// reads patch json from [stdin], applies it to [file1],
// and prints the result to [stdout] (that could be redirected to [file2]).
//
// exmaple:
//
// test.json:
// ---
// {
//   "ignore": "me",
//   "num": 0,
//   "str": "world",
//   "arr": [],
//   "obj": {
//     "ignore": { "data": "yes" },
//     "key": "something",
//     "num": 0
//   }
// }
//
// patch.json:
// ---
// {
//   "num": 1,
//   "str": "hello",
//   "arr": [1, 2, 3],
//   "obj": {
//     "key": "value",
//     "num": 2,
//     "add": { "obj": {} }
//   },
//   "add": "yay!"
// }
//
// # node json-merge test.json < patch.json:
// ---
// {
//     "ignore": "me",
//     "num": 1,
//     "str": "hello",
//     "arr": [
//         1,
//         2,
//         3
//     ],
//     "obj": {
//         "ignore": {
//             "data": "yes"
//         },
//         "key": "value",
//         "num": 2,
//         "add": {
//             "obj": {}
//         }
//     },
//     "add": "yay!"
// }

var fs = require('fs');

var l = process.argv.length;
var s = process.argv[l-1];
if (l !== 3 || s === '-h' || s === '--help') {
  console.log('');
  console.log('usage: node json-merge [file1] < [patch] > [file2]');
  console.log('');
  console.log('reads patch json from [stdin], applies it to [file1],');
  console.log('and prints the result to [stdout] (that could be redirected to [file2]).');
  console.log('');
  process.exit(1);
}

// read file
var str;
try {
  str = fs.readFileSync(s);
} catch(e) {
  console.error('error: cannot read file "' + s + '".');
  process.exit(1);
}
// parse
var o;
try {
  o = JSON.parse(str);
} catch(e) {
  console.error('error: cannot parse file "' + s + '".');
  process.exit(1);
}

// main merging function
function merge(o1, o2) {
  for (var k in o2) if (o2.hasOwnProperty(k)) {
    if ( (typeof(o1[k]) === 'object') && (o1[k] instanceof Object) &&
         (typeof(o2[k]) === 'object') && (o2[k] instanceof Object) )
    {
      // merge recursively
      merge(o1[k], o2[k]);
    }
    else { o1[k] = o2[k]; } // add or overwrite
  }
}

// read input
str = '';
process.stdin.on('data', function(s) {
  str = str + s;
});
process.stdin.on('end', function() {
  var patch;
  try {
    patch = JSON.parse(str);
  } catch(e) {
    console.error('error: cannot parse patch from stdin.')
    process.exit(1);
  }
  merge(o, patch);
  console.log(JSON.stringify(o, null, 4));
});
