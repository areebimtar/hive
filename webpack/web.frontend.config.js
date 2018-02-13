const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const Config = require('./frontend.config.js');

const MODULE_NAME = 'web';

const options = {
  moduleName: MODULE_NAME,
  moduleContext: './src/client',
  moduleEntry: {
    client: './src/client/main.js',
    adminChunk: './src/admin/main.js'
  },
  additionalEntries: ['font-awesome-webpack!./theme/font-awesome.config.js'],
  plugins: [
    new webpack.EnvironmentPlugin([
      'HIVE_INTERCOM_APP_ID'
    ]),
    new HtmlWebpackPlugin({
      chunks: ['client'],
      template: 'static-resources/index.ejs',
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      chunks: ['adminChunk'],
      template: '../admin/static-resources/index.ejs',
      filename: 'admin.html'
    })
  ]
};

module.exports = Config(options);
