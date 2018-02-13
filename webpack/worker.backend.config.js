var Config = require('./backend.config.js');

const options = {
  moduleName: 'worker',
  moduleEntry: './src/main.js',
  logger: './src/logger.js'
};

module.exports = Config(options);
