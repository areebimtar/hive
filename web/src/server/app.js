import Promise from 'bluebird';
import {AUTH} from 'global/constants';
import Models from './db/models';
import passport from 'passport';
import Session from 'express-session';
import pgSessionStoreCreator from 'connect-pg-simple';
import compression from 'compression';
import api from './api';
import logger from './logger';
import cookieParser from 'cookie-parser';
import RabbitClient from './rabbit/rabbitClient';
import { CHANNEL, CHANNEL_NAMES } from 'global/constants';

import Etsy from 'global/modules/etsy/index';
import Shopify from 'global/modules/shopify/index';

import _ from 'lodash';

const pgSessionStore = pgSessionStoreCreator(Session);

const Channels = [
  Etsy,
  Shopify
];

function registerOAuthRoutes(auth, prefix, server) {
  server.get(`${prefix}/${auth.provider}`, auth.authStartHandler());
  server.get(`${prefix}/${auth.provider}/callback`, auth.authCallbackHandler());
}

function registerAuthRoutes(auth, prefix, server) {
  switch (auth.type) {
    case AUTH.OAUTH_1:
    case AUTH.SHOPIFY_OAUTH_2:
      registerOAuthRoutes(auth, prefix, server);
      break;
    default: throw new Error(`Unknown auth type: ${auth.type}`);
  }
}

function destroySession(session) {
  return new Promise((resolve, reject) => {
    try {
      session.destroy(resolve);
    } catch (error) {
      reject();
    }
  });
}

const destroySessionMiddleware = config => async (request, responce, next) => {
  const cookieName = _.get(config, ['session', 'cookieName']);
  const cookiesString = _.get(request, ['headers', 'cookie'], '');
  const sessionCookies = cookiesString.match(new RegExp(`(^${cookieName}|[; ]${cookieName})[ ]?=`, 'gi'));

  if (sessionCookies && sessionCookies.length > 1) {
    await destroySession(request.session);
  }
  next();
};

export class App {
  constructor(server, dbConnections, config) {
    this._server = server;
    this._config = config;
    this._dbConnections = dbConnections;

    // get DB models
    this._dbModels = _.reduce(dbConnections, (dbModels, dbConnection, dbName) =>
      _.set(dbModels, dbName, Models(dbConnection)), {});
  }

  async initRabbit() {
    if (this._config.rabbitmq) {
      if (!this._config.rabbitmq.mock) {
        try {
          this._rabbitClient = await RabbitClient(this._config.rabbitmq.uri, logger);
        } catch (e) {
          logger.error('Cannot connect to RabbitMq');
          throw e;
        }
      }
    } else {
      throw new Error(`RabbitMq not configured [${this._config.rabbitmq}]`);
    }
  }

  async init() {
    const simplifiedConfig = _.omit(this._config, 'cryptoContent');
    logger.info('Initializing application with configuration: ' + JSON.stringify(simplifiedConfig, undefined, 2));
    // use compression
    this._server.use(compression());
    // use session cookies
    this._server.use(Session({
      secret: this._config.session.secretKey,
      name: this._config.session.cookieName,
      cookie: {
        path: '/',
        domain: this._config.session.cookieDomain,
        secure: this._config.session.secureCookie,
        httpOnly: true,
        maxAge: this._config.session.cookieExpiresIn
      },
      saveUninitialized: false,
      unset: 'destroy',
      store: new pgSessionStore({
        conString: this._config.session.store.dbConnectionString
      })

    }));
    // initialize passport.js
    this._server.use(passport.initialize());
    this._server.use(passport.session());
    // add cookie parser
    this._server.use(cookieParser());
    this._server.use(destroySessionMiddleware(this._config));

    await this.initRabbit();

    this._channels = {};

    // initialize channels (and their routes)
    for (let i = 0; i < Channels.length; ++i) {
      const Channel = Channels[i];
      const channel = new Channel(this._config);
      this._channels[channel.ID] = channel;
      channel.auth.authenticated = this.userAuthenticated.bind(this, channel);

      registerAuthRoutes(channel.auth, this._config.auth.prefix, this._server);
    }

    // initialize server API
    api(this._server, this._config, this._dbModels, this._rabbitClient);
  }

  enqueueShopSync(companyId, channelId, userId, shopId, dbName) {
    switch (channelId) {
      case CHANNEL.ETSY:
        return this._rabbitClient.enqueueShopSyncEtsy(companyId, channelId, shopId, dbName);
      default:
        return this._rabbitClient.enqueueShopSync(userId, shopId, CHANNEL_NAMES[channelId]);
    }
  }

  async userAuthenticated(channel, session, accountProperties) {
    logger.debug(`Finishing channel ${channel.NAME} authorization, session=${JSON.stringify(session)}, accountProperties=${JSON.stringify(accountProperties)}`);

    try {
      if (!accountProperties.token) {
        throw new Error(`Channel ${channel.NAME} authorization succeeded but accountProperties are invalid: ${JSON.stringify(accountProperties)}`);
      }

      const models = this._dbModels[session.db];
      const shops = await models.db.tx(async (t) => {
        const accounts = await models.accounts.getByToken(session.companyId, channel.ID, accountProperties.token, t);
        let accountId;
        if (!_.isEmpty(accounts)) {
          accountId = _.get(accounts, '[0].id');
        } else {
          accountId = await models.accounts.add(session.companyId, channel.ID, accountProperties.token, accountProperties.tokenSecret, t);
        }

        const channelShops = await channel.getShops(accountProperties);
        logger.debug(`Channel ${channel.NAME} shops for newly created accountId(${accountId}):`, channelShops);

        // get all shops in our DB with same channel_shop_id
        const existingDbShops = await Promise.map(channelShops, channelShop => models.shops.getByChannelShopId(channelShop.channel_shop_id));
        // filter out all channel shops which are already stored in our DB and are associated with same account id (eg do not store duplicate shops in one user account)
        const newChannelShops = _.filter(channelShops, channelShop => {
          // get only shops with channelShop.channel_id
          const channelDbShops = _.reduce(existingDbShops, (existingShops, dbShops) => existingShops.concat(_.filter(dbShops, dbShop => dbShop.channel_shop_id === String(channelShop.channel_shop_id))), []);
          // check if any shop with this channel id is already associated with account id
          return !_.find(channelDbShops, shop => shop.account_id === String(accountId));
        });

        const dbShops = await models.shops.addShops(accountId, newChannelShops, t);

        await models.userProfiles.update(session.userId, { last_seen_shop: _.isArray(dbShops) && dbShops[0] });

        return dbShops;
      });

      logger.debug(`Shops created in database (${shops})`);
      await Promise.map(_.compact(shops), (shopId) => {
        logger.debug(`Enqueue shop ${shopId} sync`);
        return this.enqueueShopSync(session.companyId, channel.ID, session.userId, shopId, session.db);
      });
    } catch (error) {
      logger.error(error);
    }
  }
}
