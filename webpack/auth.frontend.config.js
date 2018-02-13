const Config = require('./frontend.config.js');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const options = {
  moduleName: 'auth',
  moduleContext: './src/client',
  moduleEntry: './src/client/main.js',
  plugins: [
    new webpack.EnvironmentPlugin([
      'HIVE_INTERCOM_APP_ID'
    ]),
    new HtmlWebpackPlugin({
      template: 'static-resources/index.ejs'
    })
  ]
};

module.exports = Config(options);
