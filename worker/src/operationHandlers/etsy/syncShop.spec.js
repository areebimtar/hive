import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import moment from 'moment';

import module from './syncShop';
import { FIELDS } from '../../../../shared/modules/etsy/constants';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('syncShop', () => {
  let getProductsModifiedOnEtsy;

  beforeEach(() => {
    getProductsModifiedOnEtsy = module.__get__('getProductsModifiedOnEtsy');
  });

  it('should skip products which will be uploaded to etsy', () => {
    const ourProducts = [
      { id: 1, listing_id: 11 },
      { id: 2, listing_id: 22 }
    ];
    const productsToUpload = [1, 2];
    const etsyListings = [];
    const redownloadListingExpirationPeriod = 7;

    const result = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload, redownloadListingExpirationPeriod);
    expect(result).to.eql([]);
  });

  it('should skip products which are no longer on Etsy', () => {
    const ourProducts = [
      { id: 1, listing_id: 11 },
      { id: 2, listing_id: 22 }
    ];
    const productsToUpload = [];
    const etsyListings = [
      { listing_id: 1 },
      { listing_id: 2 },
      { listing_id: 3 }
    ];
    const redownloadListingExpirationPeriod = 7;

    const result = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload, redownloadListingExpirationPeriod);
    expect(result).to.eql([]);
  });

  it('should not download products which were already synchronized', () => {
    const listingTime = moment().unix();
    const ourProducts = [
      { id: 1, listing_id: 11, [FIELDS.LAST_MODIFIED_TSZ]: listingTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: listingTime },
      { id: 2, listing_id: 22,  [FIELDS.LAST_MODIFIED_TSZ]: listingTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: listingTime }
    ];
    const productsToUpload = [];
    const etsyListings = [
      { listing_id: 11, last_modified_tsz: listingTime },
      { listing_id: 22, last_modified_tsz: listingTime },
      { listing_id: 33, last_modified_tsz: listingTime }
    ];
    const redownloadListingExpirationPeriod = 7;

    const result = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload, redownloadListingExpirationPeriod);
    expect(result).to.eql([]);
  });

  it('should not download products which were synchronized in past 7 days', () => {
    const listingTime = moment().subtract(2, 'days').unix();
    const ourProducts = [
      { id: 1, listing_id: 11, [FIELDS.LAST_MODIFIED_TSZ]: listingTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: listingTime },
      { id: 2, listing_id: 22,  [FIELDS.LAST_MODIFIED_TSZ]: listingTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: listingTime }
    ];
    const productsToUpload = [];
    const etsyListings = [
      { listing_id: 11, last_modified_tsz: listingTime },
      { listing_id: 22, last_modified_tsz: listingTime },
      { listing_id: 33, last_modified_tsz: listingTime }
    ];
    const redownloadListingExpirationPeriod = 7;

    const result = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload, redownloadListingExpirationPeriod);
    expect(result).to.eql([]);
  });

  it('should download products which out of sync', () => {
    const productTime = moment().unix();
    const listingTime = moment().subtract(1, 'days').unix();
    const ourProducts = [
      { id: 1, listing_id: 11, [FIELDS.LAST_MODIFIED_TSZ]: productTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: productTime },
      { id: 2, listing_id: 22,  [FIELDS.LAST_MODIFIED_TSZ]: productTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: productTime },
      { id: 3, listing_id: 33,  [FIELDS.LAST_MODIFIED_TSZ]: listingTime, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: listingTime }
    ];
    const productsToUpload = [];
    const etsyListings = [
      { listing_id: 11, last_modified_tsz: listingTime },
      { listing_id: 22, last_modified_tsz: listingTime },
      { listing_id: 33, last_modified_tsz: listingTime }
    ];
    const redownloadListingExpirationPeriod = 7;

    const result = getProductsModifiedOnEtsy(etsyListings, ourProducts, productsToUpload, redownloadListingExpirationPeriod);
    expect(result).to.eql([1, 2]);
  });

  describe('updateStateOnProducts', () => {
    let updateStateOnProducts;

    beforeEach(() => {
      updateStateOnProducts = module.__get__('updateStateOnProducts');
    });

    it('should do nothing if states are same', async () => {
      const models = { products: { setState: sinon.spy() } };
      const ourProducts = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'draft' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];
      const etsyListings = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'draft' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];

      await updateStateOnProducts(models, etsyListings, ourProducts);

      expect(models.products.setState).to.not.have.been.called;
    });

    it('should update states', async () => {
      const models = { products: { setState: sinon.spy() } };
      const ourProducts = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'draft' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];
      const etsyListings = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'active' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];

      await updateStateOnProducts(models, etsyListings, ourProducts);

      expect(models.products.setState).to.have.been.calledOnce;
      expect(models.products.setState).to.have.been.calledWithExactly(2, 'active');
    });

    it('should delete product if we get invalid listing state', async () => {
      const models = { products: { setState: sinon.spy(), deleteByIds: sinon.stub() } };
      const ourProducts = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'draft' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];
      const etsyListings = [
        { id: 1, listing_id: 123, state: 'draft' },
        { id: 2, listing_id: 234, state: 'edit' },
        { id: 3, listing_id: 345, state: 'draft' }
      ];

      await updateStateOnProducts(models, etsyListings, ourProducts);

      expect(models.products.deleteByIds).to.have.been.calledOnce;
      expect(models.products.deleteByIds).to.have.been.calledWithExactly([2]);
    });
  });

  describe('updateCanWriteInventoryFlag', () => {
    let updateCanWriteInventoryFlag;

    beforeEach(() => {
      updateCanWriteInventoryFlag = module.__get__('updateCanWriteInventoryFlag');
    });

    it('should do nothing if flags are same', async () => {
      const models = { products: { updateProducts: sinon.spy() } };
      const ourProducts = [
        { id: 1, listing_id: 123, can_write_inventory: true },
        { id: 2, listing_id: 234, can_write_inventory: true },
        { id: 3, listing_id: 345, can_write_inventory: true }
      ];
      const etsyListings = [
        { id: 1, listing_id: 123, can_write_inventory: true },
        { id: 2, listing_id: 234, can_write_inventory: true },
        { id: 3, listing_id: 345, can_write_inventory: true }
      ];

      await updateCanWriteInventoryFlag(models, etsyListings, ourProducts);

      expect(models.products.updateProducts).to.not.have.been.called;
    });

    it('should update flag', async () => {
      const models = { products: { updateProducts: sinon.spy() } };
      const ourProducts = [
        { id: 1, listing_id: 123, can_write_inventory: true },
        { id: 2, listing_id: 234, can_write_inventory: true },
        { id: 3, listing_id: 345, can_write_inventory: true }
      ];
      const etsyListings = [
        { id: 1, listing_id: 123, can_write_inventory: true },
        { id: 2, listing_id: 234, can_write_inventory: false },
        { id: 3, listing_id: 345, can_write_inventory: true }
      ];

      await updateCanWriteInventoryFlag(models, etsyListings, ourProducts);

      expect(models.products.updateProducts).to.have.been.calledOnce;
      const products = models.products.updateProducts.args[0][0];
      expect(products[0].id).to.eql(2);
      expect(products[0].can_write_inventory).to.be.false;
      expect(products[0]._hive_last_modified_tsz).to.be.defined;
    });
  });
});
