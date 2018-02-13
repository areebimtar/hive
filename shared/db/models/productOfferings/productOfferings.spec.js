import Promise from 'bluebird';
import _ from 'lodash';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as ProductOfferingsModule from './productOfferings';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('ProductOfferings', () => {
  describe('insert/delete', () => {
    let connectionMock;
    beforeEach(() => {
      connectionMock = {
        none: sinon.stub(),
        one: sinon.stub().returns({get: () => Promise.resolve('1')}),
        many: sinon.stub(),
        any: sinon.stub()
      };
    });

    afterEach(() => {
      // do nothing
    });

    it('should fail without productId', () => {
      const po = new ProductOfferingsModule.ProductOfferings(connectionMock);
      return expect(po.addFromProductIdUsingInventory()).to.be.rejectedWith(TypeError, 'bad productId: undefined');
    });

    it('should delete productOfferings by productId', () => {
      const po = new ProductOfferingsModule.ProductOfferings(connectionMock);
      const productId = 13;
      const expected = {
        sql: 'DELETE FROM product_offerings WHERE (product_id=$1::bigint)',
        params: [ productId ]
      };

      return po.deleteByProductId(productId)
        .then( () => expect(connectionMock.none).to.have.been.calledWith(expected.sql, expected.params));
    });

    it('should insert into product offerings from inventory', () => {
      const po = new ProductOfferingsModule.ProductOfferings(connectionMock);
      const expectedSql = 'INSERT INTO product_offerings (product_id, sku, price, quantity, visibility) VALUES ($1, $2, $3, $4, $5) RETURNING id';
      const expectedParams = [
        ['15', 'sku', 100.2, 3003, true]
      ];
      const productOfferings = [{
        sku: 'sku',
        price: 100.20,
        quantity: 3003,
        visibility: true,
        valueIds: ['101', '201'],
        optionIds: ['11', '21']
      }];
      return po.addFromProductIdUsingInventory('15', productOfferings, connectionMock)
        .then( () => {
          expect(connectionMock.one).to.have.callCount(expectedParams.length);
          _.forEach(expectedParams, (params) =>
            expect(connectionMock.one).to.have.been.calledWith(expectedSql, params));
        });
    });

    it('should insert into product offerings from inventory with visibility false', () => {
      const po = new ProductOfferingsModule.ProductOfferings(connectionMock);
      const expectedSql = 'INSERT INTO product_offerings (product_id, sku, price, quantity, visibility) VALUES ($1, $2, $3, $4, $5) RETURNING id';
      const expectedParams = [
        ['15', 'sku', 100.2, 3003, false]
      ];
      const productOfferings = [{
        sku: 'sku',
        price: 100.20,
        quantity: 3003,
        visibility: false,
        valueIds: ['101', '201'],
        optionIds: ['11', '21']
      }];
      return po.addFromProductIdUsingInventory('15', productOfferings, connectionMock)
        .then( () => {
          expect(connectionMock.one).to.have.callCount(expectedParams.length);
          _.forEach(expectedParams, (params) =>
            expect(connectionMock.one).to.have.been.calledWith(expectedSql, params));
        });
    });
  });

  describe('chunking', () => {
    class AddSingleMock {
      constructor() {
        this.pendingOfferings = [];
        this.resolvedOfferings = [];
      }
      addSinglePending = () => {
        const promise = new Promise(resolve => {
          if (false) { resolve(); } // eslint-disable-line
        });
        this.pendingOfferings.push(promise);
        return promise;
      }
      addSingleResolving = (productId, productOffering) => {
        const promise = Promise.resolve(productOffering);
        this.resolvedOfferings.push(promise);
        return promise;
      }
    }

    const OFFERINGS_CHUNK_SIZE = 10;
    const productId = '1';
    const offerings = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11'];

    it(`should add up to ${OFFERINGS_CHUNK_SIZE} offerings at a time`, async () => {
      const addSingleMock = new AddSingleMock();
      ProductOfferingsModule.__Rewire__('addSingle', addSingleMock.addSinglePending);
      const po = new ProductOfferingsModule.ProductOfferings();
      expect(offerings).to.have.length.above(OFFERINGS_CHUNK_SIZE);
      po.addFromProductIdUsingInventory(productId, offerings);
      await Promise.delay(200);
      expect(addSingleMock.pendingOfferings).to.have.length(OFFERINGS_CHUNK_SIZE);
      ProductOfferingsModule.__ResetDependency__('addSingle');
    });

    it('should add all offerings eventually', async () => {
      const addSingleMock = new AddSingleMock();
      ProductOfferingsModule.__Rewire__('addSingle', addSingleMock.addSingleResolving);
      const po = new ProductOfferingsModule.ProductOfferings();
      const resultResolving = await po.addFromProductIdUsingInventory(productId, offerings);
      expect(resultResolving).to.have.length(offerings.length);
      ProductOfferingsModule.__ResetDependency__('addSingle');
    });
  });
});
