import pgSquel from 'global/pgSquel';
import { assert } from 'global/assert';
import * as constants from './constants';

export class CompositeRequests {
  constructor(db, models) {
    this._db = db;
    this._models = models;
  }

  async getShopAccountByShopId(shopId, db = this._db) {
    const shop = await this._models.shops.getById(shopId, db);
    assert(shop, `There is no shop with ${shopId} ID`);

    const account = await this._models.accounts.getById(shop.account_id, db);
    return [shop, account];
  }

  async getShopAccountChannelByShopId(shopId, db = this._db) {
    const [shop, account] = await this.getShopAccountByShopId(shopId, db);
    const channel = await this._models.channels.getById(account.channel_id, db);
    return [shop, account, channel];
  }

  async getProductShopAccountByProductId(productId, db = this._db) {
    const product = await this._models.products.getById(productId, db);
    if (!product) { throw new Error(`Could not resolve unique product for id: ${productId}`); }
    const [ shop, account ] = await this.getShopAccountByShopId(product.shop_id, db);
    return [ product, shop, account ];
  }

  async getProductShopAccountChannelByProductId(productId, db = this._db) {
    const [product, shop, account ] = await this.getProductShopAccountByProductId(productId, db);
    const channel = await this._models.channels.getById(account.channel_id, db);
    return [product, shop, account, channel];
  }

  async getSectionShopAccount(sectionId, shopId, db = this._db) {
    const section = await this._models.sections.getSection(shopId, sectionId, db);
    const [shop, account] = await this.getShopAccountByShopId(shopId, db);
    return [section, shop, account];
  }

  async getImagesToUploadByProductId(productId, db = this._db) {
    const productPropertiesQuery = pgSquel
      .select()
      .from('product_properties')
      .field('id')
      .field('unnest(photos)', 'image_id')
      .where('id = ?::bigint', productId);

    const { text, values } = pgSquel
      .select()
      .from(productPropertiesQuery, 'pp')
      .field('pp.id')
      .field('images.id')
      .join('images', null, 'pp.image_id=images.id')
      .where('channel_image_id is null')
      .toParam();

    return db.any(text, values);
  }

  async deleteImageIfNotUsed(imageId, db = this._db) {
    const { text, values } = pgSquel
      .select()
      .from('product_properties')
      .field('id')
      .where(`photos && '{?}::bigint'`, imageId)
      .toParam();
    const products = await db.any(text, values);

    if (!products.length) { return null; }

    return this._models.images.deleteById(imageId, db);
  }

  async getImageByHash(shopId, sha, db = this._db) {
    const velaImagesQuery = pgSquel
      .select()
      .from('vela_images')
      .field('id')
      .where('hash = ?::text', sha);

    const { text, values } = pgSquel
      .select()
      .from('images')
      .join(velaImagesQuery, 'vi', 'vi.id = images.vela_image_id')
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return db.oneOrNone(text, values);
  }

  getVelaImageByImageId(imageId, db = this._db) {
    const { text, values } = pgSquel
      .select()
      .from('vela_images')
      .join('images', null, 'vela_images.id = images.vela_image_id')
      .where('images.id = ?::bigint', imageId)
      .toParam();

    return db.oneOrNone(text, values);
  }

  getFirstImageToUpload(productIds) {
    const productPropertiesQuery = pgSquel
      .select()
      .from('product_properties')
      .field('DISTINCT(UNNEST(photos))', 'image_id')
      .field('id')
      .where('id IN ?', productIds);

    const { text, values } = pgSquel
      .select()
      .from('images')
      .field('pp.id', 'id')
      .field('images.id', 'image_id')
      .join(productPropertiesQuery, 'pp', 'images.id = pp.image_id')
      .where('channel_image_id is null')
      .limit(1)
      .toParam();

    return this._db.oneOrNone(text, values);
  }

  getImagesByIds(imageIds) {
    const { text, values } = pgSquel
      .select()
      .field('images.id')
      .field('channel_image_id')
      .field('fullsize_url')
      .field('vela_image_id')
      .field('shop_id')
      .field('hash')
      .from('images')
      .left_join('vela_images', null, 'vela_images.id = images.vela_image_id')
      .where('images.id IN ?', imageIds)
      .toParam();

    return this._db.any(text, values);
  }

  getShopsToSync(interval, limit, channel, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .field('shops.id')
      .field('shops.account_id')
      .field('shops.last_sync_timestamp')
      .field('shops.rabbit')
      .field('shops.invalid')
      .field('shops.sync_status')
      .from('shops')
      .join('accounts', null, 'shops.account_id=accounts.id')
      .where(pgSquel.expr()
        .and('accounts.channel_id = ?', channel)
        .and(`last_sync_timestamp < now() - interval '? ms'`, interval)
        .and(pgSquel.expr()
          .or('invalid = false')
          .or(pgSquel.expr()
            .and('invalid = true')
            .and('sync_status = ?', constants.SHOP_SYNC_IN_VACATION_MODE))))
      .limit(limit)
      .toParam();

    return connection.any(text, values);
  }

  getImagesByShopId(shopId) {
    const { text, values } = pgSquel
      .select()
      .field('images.id')
      .field('hash')
      .from('images')
      .left_join('vela_images', null, 'vela_images.id = images.vela_image_id')
      .where('images.shop_id = ?', shopId)
      .toParam();

    return this._db.any(text, values);
  }
}
