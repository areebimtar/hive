/*eslint no-var: 0 */
//var webpack = require('webpack');

var fs = require('fs');
var nodeModules = {};
fs.readdirSync('../../node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });


module.exports = {
  entry: ['./migrateUsersToSingleDB.js'],
  devtool: 'sourcemap',
  target: 'node',
  externals: nodeModules,
  output: {
    publicPath: "/dist/",
    path: './dist',
    filename: 'bundle.js'
  },
  // plugins: [
  // ],
  resolve: {
    extensions: ["", ".js", ".json"],
  },
  module: {
    loaders: [
      { test: /\.jsx$|\.js$/, exclude: /node_modules/, loader: 'babel' },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  }
};
