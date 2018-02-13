import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import SingleChild from 'single-child';
import UrlResolver from 'url';
import request from 'request';
import path from 'path';

import authBEConfig from './webpack/auth.backend.config.js';
import authFEConfig from './webpack/auth.frontend.config.js';
import webBEConfig from './webpack/web.backend.config.js';
import webFEConfig from './webpack/web.frontend.config.js';
import managerBEConfig from './webpack/manager.backend.config.js';
import workerBEConfig from './webpack/worker.backend.config.js';
import handlerBEConfig from './webpack/handler.backend.config.js';

const moduleName = process.env.MODULE;
const clientExist = process.env.CLIENT !== 'false';

let webpackBEConfig;
let webpackFEConfig;
let API_PORT;

switch (moduleName) {
  case 'auth':
    webpackBEConfig = authBEConfig;
    webpackFEConfig = authFEConfig;
    API_PORT = parseInt(process.env.HIVE_AUTH_PORT, 10) || 44300;
    break;
  case 'web':
    webpackBEConfig = webBEConfig;
    webpackFEConfig = webFEConfig;
    API_PORT = parseInt(process.env.SERVER_PORT, 10) || 3000;
    break;
  case 'worker':
    webpackBEConfig = workerBEConfig;
    break;
  case 'handler':
    webpackBEConfig = handlerBEConfig;
    break;
  case 'manager':
    webpackBEConfig = managerBEConfig;
    break;
  default:
    throw new Error('Unknown module: ' + moduleName);
}

const SERVER_BASE = 'http://' + (process.env.SERVER_DOMAIN || 'localhost');
const CLIENT_PORT = API_PORT + 1;
let server = null;

const moduleServerEntry = path.join(__dirname, 'dist', moduleName, 'server.js');
const moduleClientEntry = path.join(__dirname, 'dist', moduleName, 'client');

const getDevelopmentWebpackBEConfig = webpackConfig => {
  return {
    ...webpackConfig,
    debug: true,
    watch: true,
    devtool: 'sourcemap',
    inline: true
  };
};

const getDevelopmentWebpackFEConfig = webpackConfig => {
  const config = {
    ...webpackConfig,
    devtool: 'sourcemap',
    inline: true
  };

  for (let entryPoint in config.entry) {
    if (config.entry.hasOwnProperty(entryPoint)) {
      config.entry[entryPoint] = [`webpack-dev-server/client?${SERVER_BASE}:${CLIENT_PORT}`,
        'webpack/hot/only-dev-server', ...config.entry[entryPoint]];
    }
  }

  config.plugins.push(new webpack.HotModuleReplacementPlugin());

  return config;
};

const dumpErrors = errors => {
  errors.forEach(error => {
    console.log(error);
  });
};

const throwError = reason => {
  if (server) {
    server.kill();
  }

  console.error('Killing dev runner');
  throw new Error(reason);
};

webpack(getDevelopmentWebpackBEConfig(webpackBEConfig), (err, stats) => {
  if (err) {
    dumpErrors(err);
    throwError('Fatal error while compiling.');
  }

  const jsonStats = stats.toJson();
  if (jsonStats.errors.length > 0) {
    dumpErrors(jsonStats.errors);
  }
  if (jsonStats.warnings.length > 0) {
    dumpErrors(jsonStats.warnings);
  }

  if (!server) {
    console.info('Starting dev runner');
    server = new SingleChild('node', [moduleServerEntry], {
      stdio: [0, 1, 2],
      env: {...process.env, NODE_ENV: 'development'}
    });
    server.start();
  } else {
    console.info('Restarting dev runner');
    server.restart();
  }
});

if (clientExist) {
  const app = new WebpackDevServer(webpack(getDevelopmentWebpackFEConfig(webpackFEConfig)), {
    contentBase: moduleClientEntry,
    publicPath: '/',
    quiet: false,
    noInfo: false,
    hot: true,
    stats: {
      assets: true,
      colors: true,
      version: false,
      hash: true,
      timings: true,
      chunks: false,
      chunkModules: false
    }
  });
  app.listen(CLIENT_PORT);

  app.use('/', (req, res) => {
    const targetUrl = UrlResolver.resolve(`${SERVER_BASE}:${API_PORT}`, req.url);

    req
      .pipe(request(targetUrl))
      .on('error', e => {
        console.error(`Problems with proxy. Make sure API is running on ${SERVER_BASE}:${API_PORT}`, e);
        res
          .status(500)
          .send(e);
      })
      .pipe(res);
  });
}
