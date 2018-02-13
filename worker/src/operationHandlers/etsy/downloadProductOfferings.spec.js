import Promise from 'bluebird';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { addProductOfferingsInventoryShops } from './downloadProductOfferings';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('downloadProductOfferings', () => {
  let connectionMock;
  let modelsMock;
  beforeEach(() => {
    connectionMock = {
      none: sinon.stub(),
      one: sinon.stub(),
      many: sinon.stub(),
      any: sinon.stub()
    };
    modelsMock = {
      productOfferings: {
        addFromProductIdUsingInventory: sinon.spy(() => { return Promise.resolve(); }),
        addFromProductIdUsingVariations: sinon.spy(() => { return Promise.resolve(); })
      }
    };
  });

  afterEach(() => {
    // do nothing
  });

  it('should add productOfferings for inventory shops', async () => {
    const PRODUCT_ID = '477';
    const addVariationsResultMock = [{
      valueIdToOptionIdMap: { 2622335397: '5647', 2998854708: '5648'}
    }, {
      valueIdToOptionIdMap: { 2: '5649', 9: '5650' }
    }];
    const productOfferings = [{
      sku: '464',
      price: 222,
      quantity: 55,
      visibility: true,
      valueIds: [ 2622335397, 2 ],
      values: [ '50', 'Blue' ]
    }, {
      sku: '464',
      price: 222,
      quantity: 55,
      visibility: true,
      valueIds: [ 2622335397, 9 ],
      values: [ '50', 'Red' ]
    }, {
      sku: '464',
      price: 378,
      quantity: 45,
      visibility: true,
      valueIds: [ 2998854708, 2 ],
      values: [ '60', 'Blue' ]
    }, {
      sku: '464',
      price: 378,
      quantity: 45,
      visibility: true,
      valueIds: [ 2998854708, 9 ],
      values: [ '60', 'Red' ]
    }];
    const expectedDbProductOfferings = [{
      optionIds: [ '5647', '5649' ],
      price: 222,
      quantity: 55,
      sku: '464',
      valueIds: [ 2622335397, 2 ],
      values: [ '50', 'Blue'],
      visibility: true
    }, {
      optionIds: [ '5647', '5650' ],
      price: 222,
      quantity: 55,
      sku: '464',
      valueIds: [ 2622335397, 9],
      values: [ '50', 'Red' ],
      visibility: true
    }, {
      optionIds: [ '5648', '5649' ],
      price: 378,
      quantity: 45,
      sku: '464',
      valueIds: [ 2998854708, 2 ],
      values: [ '60', 'Blue' ],
      visibility: true
    }, {
      optionIds: [ '5648', '5650' ],
      price: 378,
      quantity: 45,
      sku: '464',
      valueIds: [ 2998854708, 9 ],
      values: [ '60', 'Red' ],
      visibility: true
    }];

    await addProductOfferingsInventoryShops(connectionMock, modelsMock, addVariationsResultMock, productOfferings, PRODUCT_ID);
    expect(modelsMock.productOfferings.addFromProductIdUsingInventory).to.be.calledWithExactly(PRODUCT_ID, expectedDbProductOfferings, connectionMock);
  });

  it('should use value instead of valueId if valueId is null', async () => {
    const PRODUCT_ID = '477';
    const addVariationsResultMock = [{
      valueIdToOptionIdMap: { Gold: '5647', Copper: '5648'}
    }];
    const productOfferings = [{
      sku: '',
      price: 25,
      quantity: 50,
      visibility: true,
      valueIds: [ null ],
      values: [ 'Copper' ]
    }, {
      sku: '',
      price: 25,
      quantity: 50,
      visibility: true,
      valueIds: [ null ],
      values: [ 'Gold' ]
    }];
    const expectedDbProductOfferings = [{
      optionIds: [ '5648' ],
      price: 25,
      quantity: 50,
      sku: '',
      valueIds: [ null ],
      values: [ 'Copper' ],
      visibility: true
    }, {
      optionIds: [ '5647' ],
      price: 25,
      quantity: 50,
      sku: '',
      valueIds: [ null ],
      values: [ 'Gold' ],
      visibility: true
    }];

    await addProductOfferingsInventoryShops(connectionMock, modelsMock, addVariationsResultMock, productOfferings, PRODUCT_ID);
    expect(modelsMock.productOfferings.addFromProductIdUsingInventory).to.be.calledWithExactly(PRODUCT_ID, expectedDbProductOfferings, connectionMock);
  });

  it('should use decoded value instead of valueId if valueId is null', async () => {
    const PRODUCT_ID = '477';
    const addVariationsResultMock = [{
      valueIdToOptionIdMap: { 'S-Women\'s Fitted': '5647', Copper: '5648'}
    }];
    const productOfferings = [{
      sku: '',
      price: 25,
      quantity: 50,
      visibility: true,
      valueIds: [ null ],
      values: [ 'Copper' ]
    }, {
      sku: '',
      price: 25,
      quantity: 50,
      visibility: true,
      valueIds: [ null ],
      values: [ 'S-Women&#39;s Fitted' ]
    }];
    const expectedDbProductOfferings = [{
      optionIds: [ '5648' ],
      price: 25,
      quantity: 50,
      sku: '',
      valueIds: [ null ],
      values: [ 'Copper' ],
      visibility: true
    }, {
      optionIds: [ '5647' ],
      price: 25,
      quantity: 50,
      sku: '',
      valueIds: [ null ],
      values: [ 'S-Women&#39;s Fitted' ],
      visibility: true
    }];

    await addProductOfferingsInventoryShops(connectionMock, modelsMock, addVariationsResultMock, productOfferings, PRODUCT_ID);
    expect(modelsMock.productOfferings.addFromProductIdUsingInventory).to.be.calledWithExactly(PRODUCT_ID, expectedDbProductOfferings, connectionMock);
  });
});
