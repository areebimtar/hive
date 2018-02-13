var Config = require('./backend.config.js');
var CopyWebpackPlugin = require('copy-webpack-plugin');

const options = {
  moduleName: 'handler',
  moduleEntry: './src/main.js',
  logger: './src/logger.js',
  plugins: [
    new CopyWebpackPlugin([{ from: 'version'}, { from: 'handler/src/config.json'}])
  ]
};

module.exports = Config(options);
