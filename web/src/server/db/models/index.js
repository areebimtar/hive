import {Accounts} from 'global/db/models/accounts';
import {Channels} from 'global/db/models/channels';
import {Products} from 'global/db/models/products';
import {ShopifyProducts} from 'global/db/models/shopifyProducts';
import {Attributes} from 'global/db/models/attributes';
import {ProductVariations} from 'global/db/models/variations/productVariations';
import {ProductOfferings} from 'global/db/models/productOfferings/productOfferings';
import {Shops} from 'global/db/models/shops';
import {Images} from 'global/db/models/images';
import {VelaImages} from 'global/db/models/velaImages';
import {Sections} from 'global/db/models/sections';
import {UserProfiles} from './userProfiles';
import { Users } from 'global/db/models/users';
import {CompositeRequests} from 'global/db/models/compositeRequests';
import * as constants from 'global/db/models/constants';

export default function(db) {
  const models = {
    db: db,
    accounts: new Accounts(db),
    channels: new Channels(db),
    products: new Products(db),
    shopifyProducts: new ShopifyProducts(db),
    attributes: new Attributes(db),
    productVariations: new ProductVariations(db),
    productOfferings: new ProductOfferings(db),
    shops: new Shops(db),
    images: new Images(db),
    velaImages: new VelaImages(db),
    sections: new Sections(db),
    userProfiles: new UserProfiles(db),
    auth: { users: new Users(db) },
    constants: constants
  };
  models.compositeRequests = new CompositeRequests(db, models);
  return models;
}
