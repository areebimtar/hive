const webpack = require('webpack');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

const LOCALES = ['en-US'];

module.exports = function(options) {
  const ENV = process.env.NODE_ENV || 'development';

  const plugins = options.plugins || [];
  plugins.push(new webpack.DefinePlugin({
    'process.env': { 'NODE_ENV': JSON.stringify(ENV) }
  }));
  plugins.push(new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery'
  }));

  var scssLoader = 'style!css?importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!sass';
  var lessLoader = 'style!css?importLoaders=2&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!less?outputStyle=expanded';

  if (ENV === 'development') {
    //
  } else if (ENV === 'production') {
    plugins.push(new webpack.optimize.UglifyJsPlugin({ minimize: true }));
    plugins.push(new ExtractTextPlugin('[name]-style.css'));
    scssLoader = ExtractTextPlugin.extract('style', 'css!sass');
    lessLoader = ExtractTextPlugin.extract('style', 'css!less');
  }

  const rootDirectory = path.join(__dirname, '..');
  // Module folder, contain everything what belongs to module
  const moduleFolder = path.join(__dirname, '..', options.moduleName);
  const moduleContext = path.join(moduleFolder, options.moduleContext || '');

  // Absolute path to code shared between modules
  const globalSources = path.join(__dirname, '..', 'shared');

  // Absolute path to code shared in module
  const moduleSharedSources = path.join(moduleFolder, 'src', 'shared');

  // Absolute path to module sources
  const moduleSources = path.join(moduleFolder, 'src');

  // Absolute path to module entry file
  let entries;
  if (typeof(options.moduleEntry) === 'object') {
    entries = options.moduleEntry;
  } else {
    entries = {
      client: [options.moduleEntry]
    };
  }

  for (let entryPoint in entries) {
    if (entries.hasOwnProperty(entryPoint)) {
      let entryPointEntries = entries[entryPoint];
      // Make arrays from all entryPoint values
      if (entryPointEntries.constructor !== Array) {
        entryPointEntries = [entryPointEntries];
      }

      // Make all paths absolute
      entryPointEntries = entryPointEntries
        .map(entryPointPath => path.join(moduleFolder, entryPointPath));

      // Add additional entries to all entry points
      if (options.additionalEntries && options.additionalEntries.length) {
        options.additionalEntries.forEach(function (entry) {
          entryPointEntries.push(entry);
        });
      }

      entries[entryPoint] = entryPointEntries;
    }
  }

  // Absolute path to output directory
  const outputDir = path.join(__dirname, '..', 'dist', options.moduleName, 'client');

  // Includes path
  const includes = [ moduleSources, globalSources ].concat(options.inludes || []);

  return {
    context: moduleContext,
    entry: entries,
    target: 'web',
    output: {
      path: outputDir,
      filename: '[name].js',
      publicPath: '/'
    },
    devtool: 'source-map',
    module: {
      preLoaders: [
        { test: /\.js$/, loaders: ['eslint'], include: includes, exclude: /node_modules/ }
      ],
      loaders: [
        { test: /\.jsx$|\.js$/, loaders: ['react-hot', 'babel'], include: includes },
        { test: /\.tsx?$/, loader: 'ts-loader' },
        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.css$/, loader: 'style-loader!css-loader?root=.' },
        { test: /\.scss$/, loader: scssLoader },
        { test: /\.less$/, loader: lessLoader },
        { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
        { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
        { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
        { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
        { test: /\.(png|gif)$/, loader: 'file-loader?name=[hash].[ext]' }
      ]
    },
    resolve: {
      extensions: ['', '.js', '.jsx'],
      alias: {
        'ie': 'component-ie',
        'app': moduleSources,
        'shared': moduleSharedSources,
        'global': globalSources
      }
    },
    plugins: plugins
  };
};
