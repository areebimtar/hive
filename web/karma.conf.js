const webpack = require('webpack');
var path = require('path');
var RewirePlugin = require('rewire-webpack');

var includes = [
  path.join(__dirname, 'src/client'),
  path.join(__dirname, 'src/admin'),
  path.join(__dirname, 'src/server'),
  path.join(__dirname, 'src/shared'),
  path.join(__dirname, '../shared')
];

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon-chai', 'es6-shim'],
    browsers: ['PhantomJS'],
    reporters: ['spec', 'junit'],
    singleRun: true,
    files: [
      '../node_modules/phantomjs-polyfill/bind-polyfill.js',
      'src/client/**/*.spec.*',
      'src/admin/**/*.spec.*',
      'src/shared/**/*.spec.*'
    ],
    webpack: {
      module: {
        loaders: [
          { test: /\.jsx$|\.js$/, exclude: /node_modules/, loaders: ['babel', 'babel-loader?plugins=babel-plugin-rewire'], include: includes },
          { test: /\.tsx?$/, loader: 'ts-loader' },
          { test: /\.json$/, loader: 'json-loader' },
          { test: /\.css$/, loader: 'style-loader!css-loader?root=.' },
          { test: /\.scss$/, loader: 'style!css?importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!sass' },
          { test: /\.less$/, loader: 'style!css?importLoaders=2&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!less?outputStyle=expanded' },
          { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
          { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
          { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream' },
          { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file' },
          { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml' },
          { test: /\.(png|gif)$/, loader: 'file-loader?name=[hash].[ext]' }
        ],
        noParse: [
          /node_modules\/sinon\//
        ]
      },
      resolve: {
        alias: {
          sinon: 'sinon/pkg/sinon.js',
          ie: 'component-ie',
          // 'constants': path.join(__dirname, 'src/client/constants'),
          // 'utils': path.join(__dirname, 'src/client/utils'),
          app: path.join(__dirname, 'src'),
          shared: path.join(__dirname, 'src/shared'),
          global: path.join(__dirname, '../shared')
        }
      },
      plugins: [
        new RewirePlugin(),
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery'
        })
      ]
    },
    preprocessors: {
      'src/client/**/*.spec.js': ['webpack'],
      'src/admin/**/*.spec.js': ['webpack'],
      'src/shared/**/*.spec.js': ['webpack']
    },
    plugins: [
      require('karma-webpack'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-phantomjs-launcher'),
      require('karma-chrome-launcher'),
      require('karma-spec-reporter'),
      require('karma-sinon-chai'),
      require('karma-junit-reporter'),
      require('karma-es6-shim')
    ]
  });
};
