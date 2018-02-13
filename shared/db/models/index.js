import {Accounts} from './accounts';
import {Channels} from './channels';
import {Products} from './products';
import {ShopifyProducts} from './shopifyProducts';
import {Attributes} from './attributes';
import {ProductVariations} from './variations/productVariations';
import {ProductOfferings} from './productOfferings/productOfferings';
import {Shops} from './shops';
import {SyncShops} from './syncShops';
import {Images} from './images';
import {VelaImages} from './velaImages';
import {Sections} from './sections';
import { Users } from './users';
import {UserProfiles} from './userProfiles';
import {CompositeRequests} from './compositeRequests';
import {Aggregates} from './aggregates';

export default function(db) {
  const models = {
    db: db,
    accounts: new Accounts(db),
    channels: new Channels(db),
    products: new Products(db),
    shopifyProducts: new ShopifyProducts(db),
    attributes: new Attributes(db),
    variations: new ProductVariations(db),
    productOfferings: new ProductOfferings(db),
    shops: new Shops(db),
    syncShops: new SyncShops(db),
    aggregates: new Aggregates(db),
    images: new Images(db),
    velaImages: new VelaImages(db),
    sections: new Sections(db),
    auth: { users: new Users(db) },
    userProfiles: new UserProfiles(db)
  };

  models.compositeRequests = new CompositeRequests(db, models);

  return models;
}
