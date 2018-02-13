var path = require('path');
var Config = require('./backend.config.js');
var CopyWebpackPlugin = require('copy-webpack-plugin');

const options = {
  moduleName: 'web',
  moduleEntry: './src/server/main.js',
  includes: [path.join(__dirname, '..', 'worker', 'src')],
  logger: './src/server/logger.js',
  plugins: [
    new CopyWebpackPlugin([{ from: 'version'}, { from: 'web/src/server/config.json'}])
  ]
};

module.exports = Config(options);
