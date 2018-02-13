var webpack = require('webpack');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');


const LOCALES = ['en-US'];

module.exports = function(options) {
  const ENV = process.env.NODE_ENV || 'development';
  const plugins = options.plugins || [];

  if (ENV === 'development') {
    plugins.push(new webpack.BannerPlugin('require("source-map-support").install();', { raw: true, entryOnly: false }));
  } else if (ENV === 'production') {
    // plugins.push(new webpack.optimize.UglifyJsPlugin({minimize: true}));
  }

  // Module folder, contain everything what belongs to module
  const moduleFolder = path.join(__dirname, '..', options.moduleName);

  // Absolute path to code shared between modules
  const globalSources = path.join(__dirname, '..', 'shared');

  // Absolute path to code shared in module
  const moduleSharedSources = path.join(moduleFolder, 'src', 'shared');

  // test sources
  const testSources = path.join(__dirname, '..', 'test');

  // Absolute path to module sources
  const moduleSources = path.join(moduleFolder, 'src');
  // Absolute path to module entry file
  const moduleEntry = path.join(moduleFolder, options.moduleEntry);
  // Absolute path to output directory
  const outputDir = path.join(__dirname, '..', 'dist', options.moduleName);
  // Includes path
  let includes = [ moduleSources, globalSources, testSources ];
  if (options.includes) {
    includes = includes.concat(options.includes);
  }

  if (process.env.DEBUG) {
    console.log('Build module:', options.moduleName);
    console.log('Module folder: ', moduleFolder);
    console.log('Module sources:', moduleSources);
    console.log('Module entry:', moduleEntry);
    console.log('Global sources:', globalSources);
    console.log('Output directory:', outputDir);
  }

  var nodeModules = {};
  fs.readdirSync('node_modules')
    .filter(function(x) {
      return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
      nodeModules[mod] = 'commonjs ' + mod;
    });

  const logger = ENV === 'test' ? path.join(testSources, 'util', 'logger.js') : path.join(moduleFolder, options.logger);

  return {
    entry: [moduleEntry],
    target: 'node',
    output: {
      path: outputDir,
      filename: 'server.js'
    },
    externals: nodeModules,
    module: {
      preLoaders: [
        { test: /\.js$/, loaders: ['eslint'], include: includes }
      ],
      loaders: [
        { test: /\.js$/, loaders: ['babel'], include: includes },
        { test: /\.tsx?$/, loader: 'ts-loader' },
        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.scss$/, loader: 'style!css?importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!sass' },
        { test: /\.less$/, loader: 'style!css?importLoaders=2&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!less?outputStyle=expanded' },
        { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
        { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
        { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream' },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file' },
        { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml' },
        { test: /\.(png|gif)$/, loader: 'file-loader?name=[hash].[ext]' }
      ]
    },
    resolve: {
      extensions: ['', '.js'],
      alias: {
        app: moduleSources,
        global: globalSources,
        shared: moduleSharedSources,
        logger: logger
      }
    },
    plugins: plugins
  };
}
