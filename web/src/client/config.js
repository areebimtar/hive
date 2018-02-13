require('babel-core/polyfill');

const version = require('raw!../../../version');
const buildVersion = require('../../../buildVersion.json');


const environment = {
  development: {
    isProduction: false
  },
  production: {
    isProduction: true
  }
}[process.env.NODE_ENV || 'development'];

module.exports = Object.assign({
  port: process.env.PORT,
  apiPort: process.env.APIPORT,
  app: {
    title: 'Vela',
    description: 'ecommerce channel manager',
    meta: {
      charSet: 'utf-8',
      name: {
        ...buildVersion,
        version
      }
    }
  },
  version
}, environment);
