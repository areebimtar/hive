var Config = require('./backend.config.js');

const options = {
  moduleName: 'manager',
  moduleEntry: './src/main.js',
  logger: './src/logger.js'
};

module.exports = Config(options);
