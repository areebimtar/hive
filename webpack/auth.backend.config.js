var Config = require('./backend.config.js');

const options = {
  moduleName: 'auth',
  moduleEntry: './src/server/main.js',
  logger: './src/server/logger.js'
};

module.exports = Config(options);
