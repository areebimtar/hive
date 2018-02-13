import chai, {expect} from 'chai';
import sinon from 'sinon'; // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';
import { fromJS, List } from 'immutable';

chai.use(sinonChai);

import * as variationsInventory from './variationsInventory';

describe('BulkEditOps - variationsInventory', () => {
  describe('getSumOfferingQuantity', () => {
    let getSumOfferingQuantity;

    beforeEach(() => {
      getSumOfferingQuantity = variationsInventory.__get__('getSumOfferingQuantity');
    });

    it('should not fail if offerings array is empty', () => {
      expect(getSumOfferingQuantity()).to.eql(null);
      expect(getSumOfferingQuantity(new List(), new List())).to.eql(null);
      expect(getSumOfferingQuantity(new List([{}]), new List())).to.eql(null);
      expect(getSumOfferingQuantity(new List(), new List([{}]))).to.eql(null);
    });

    describe('from global value', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: false}, {influencesQuantity: false}]);
      });

      it('should return global quantity', () => {
        const offerings = fromJS([
          { quantity: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(1);
      });

      it('should return global quantity (only visible value)', () => {
        const offerings = fromJS([
          { quantity: 2, visibility: false, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(1);
      });
    });

    describe('from one influencing', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: false}, {influencesQuantity: true}]);
      });

      it('should return sum of quantities', () => {
        const offerings = fromJS([
          { quantity: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { quantity: 2, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { quantity: 2, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(3);
      });

      it('should sum only visible quantities', () => {
        const offerings = fromJS([
          { quantity: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { quantity: 999, visibility: false, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { quantity: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { quantity: 2, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(3);
      });

      it('should ceil sum to 999', () => {
        const offerings = fromJS([
          { quantity: 998, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { quantity: 997, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { quantity: 998, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { quantity: 997, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(999);
      });
    });

    describe('from all influencing', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: true}, {influencesQuantity: true}]);
      });

      it('should return sum of quantities', () => {
        const offerings = fromJS([
          { quantity: 1, visibility: true },
          { quantity: 2, visibility: true },
          { quantity: 3, visibility: true }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(6);
      });

      it('should sum only visible quantities', () => {
        const offerings = fromJS([
          { quantity: 1, visibility: true },
          { quantity: 999, visibility: false },
          { quantity: 3, visibility: true }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(4);
      });

      it('should ceil sum to 999', () => {
        const offerings = fromJS([
          { quantity: 998, visibility: true },
          { quantity: 2, visibility: false },
          { quantity: 997, visibility: true }
        ]);

        expect((getSumOfferingQuantity(variations, offerings))).to.eql(999);
      });
    });
  });

  describe('getQuantity', () => {
    let getQuantity;
    let product;

    beforeEach(() => {
      getQuantity = variationsInventory.__get__('getQuantity');
      product = fromJS({quantity: '42'});
    });

    it('should keep offering value', () => {
      expect(getQuantity(product, [], 'offering value')).to.eql('offering value');
    });

    it('should get offering value if new variations are influencing quantity', () => {
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: true}]), '')).to.eql('');
    });

    it('should get product global value if there are no existing variations', () => {
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql('42');
    });

    it('should get product global value if existing offerings do not influence quantity', () => {
      product = product.set('variations', fromJS([{influencesQuantity: false}, {influencesQuantity: false}]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql('42');
    });

    it('should get partial sum of offering quantities if existing variations has one quantity influencing variation', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesQuantity: true}, {id: 2, influencesQuantity: false}]))
        .set('productOfferings', fromJS([
          {quantity: '1', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '1', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '1', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {quantity: '3', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '3', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '3', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql(4);
    });

    it('should apply min on partial sum of offering quantities', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesQuantity: true}, {id: 2, influencesQuantity: false}]))
        .set('productOfferings', fromJS([
          {quantity: '900', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '900', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '900', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {quantity: '800', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '800', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '800', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql(999);
    });

    it('should get sum of offering quantities if all existing variations are influencing quantity', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesQuantity: true}, {id: 2, influencesQuantity: true}]))
        .set('productOfferings', fromJS([
          {quantity: '1', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '3', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '5', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {quantity: '7', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '11', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '13', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql(40);
    });

    it('should apply min on sum of offering quantities', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesQuantity: true}, {id: 2, influencesQuantity: true}]))
        .set('productOfferings', fromJS([
          {quantity: '100', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '300', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '500', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {quantity: '700', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {quantity: '110', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {quantity: '130', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]))).to.eql(999);
    });

    it('should pass global value as is if during inline editing', () => {
      product = product.set('variations', fromJS([{influencesQuantity: false}, {influencesQuantity: false}]));
      expect(getQuantity(product, fromJS([{influencesQuantity: false}, {influencesQuantity: false}]), '', true)).to.eql('');
    });
  });

  describe('getMinOfferingPrice', () => {
    let getMinOfferingPrice;

    beforeEach(() => {
      getMinOfferingPrice = variationsInventory.__get__('getMinOfferingPrice');
    });

    it('should not fail if offerings array is empty', () => {
      expect(getMinOfferingPrice()).to.eql(null);
      expect(getMinOfferingPrice(new List(), new List())).to.eql(null);
      expect(getMinOfferingPrice(new List([{}]), new List())).to.eql(null);
      expect(getMinOfferingPrice(new List(), new List([{}]))).to.eql(null);
    });

    describe('from global value', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: false}, {influencesQuantity: false}]);
      });

      it('should return global price', () => {
        const offerings = fromJS([
          { price: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(1);
      });

      it('should return global price (only visible value)', () => {
        const offerings = fromJS([
          { price: 2, visibility: false, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(1);
      });
    });

    describe('from one influencing', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: false}, {influencesQuantity: true}]);
      });

      it('should return sum of quantities', () => {
        const offerings = fromJS([
          { price: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { price: 2, visibility: true, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { price: 2, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(1);
      });

      it('should sum only visible quantities', () => {
        const offerings = fromJS([
          { price: 1, visibility: true, variationOptions: [{optionId: 11}, {optionId: 21}] },
          { price: 999, visibility: false, variationOptions: [{optionId: 11}, {optionId: 22}] },
          { price: 1, visibility: true, variationOptions: [{optionId: 12}, {optionId: 21}] },
          { price: 2, visibility: true, variationOptions: [{optionId: 12}, {optionId: 22}] }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(1);
      });
    });

    describe('from all influencing', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS([{influencesQuantity: true}, {influencesQuantity: true}]);
      });

      it('should return sum of quantities', () => {
        const offerings = fromJS([
          { price: 11, visibility: true },
          { price: 2, visibility: true },
          { price: 3, visibility: true }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(2);
      });

      it('should sum only visible quantities', () => {
        const offerings = fromJS([
          { price: 11, visibility: true },
          { price: 999, visibility: false },
          { price: 3, visibility: true }
        ]);

        expect((getMinOfferingPrice(variations, offerings))).to.eql(3);
      });
    });
  });

  describe('getPrice', () => {
    let getPrice;
    let product;

    beforeEach(() => {
      getPrice = variationsInventory.__get__('getPrice');
      product = fromJS({price: 42});
    });

    it('should keep offering value', () => {
      expect(getPrice(product, fromJS([]), 'offering value')).to.eql('offering value');
    });

    it('should get offering value if new variations are influencing price', () => {
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: true}]), '')).to.eql('');
    });

    it('should get product global value if there are no existing variations', () => {
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(42);
    });

    it('should get product global value if existing offerings do not influence price', () => {
      product = product.set('variations', fromJS([{influencesPrice: false}, {influencesPrice: false}]));
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(42);
    });

    it('should get least prices for partial influence', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesPrice: true}, {id: 2, influencesPrice: false}]))
        .set('productOfferings', fromJS([
          {price: 1, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {price: 1, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {price: 1, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {price: 3, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {price: 3, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {price: 3, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(1);
    });

    it('should get least prices for all influencing', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesPrice: true}, {id: 2, influencesPrice: true}]))
        .set('productOfferings', fromJS([
          {price: 1, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {price: 3, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {price: 5, variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {price: 7, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {price: 11, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {price: 13, variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(1);
    });

    it('should pass global value as is if during inline editing', () => {
      product = product.set('variations', fromJS([{influencesPrice: false}, {influencesPrice: false}]));
      expect(getPrice(product, fromJS([{influencesPrice: false}, {influencesPrice: false}]), '', true)).to.eql('');
    });
  });

  describe('getOfferingsSku', () => {
    let getOfferingsSku;

    beforeEach(() => {
      getOfferingsSku = variationsInventory.__get__('getOfferingsSku');
    });

    it('should not fail if offerings array is empty', () => {
      expect(getOfferingsSku()).to.eql(null);
      expect(getOfferingsSku(new List())).to.eql(null);
    });

    it('should return null if skus are different', () => {
      const offerings = fromJS([
        { sku: 'qwe1', visibility: true },
        { sku: 'qwe2', visibility: true },
        { sku: 'qwe3', visibility: true }
      ]);

      expect((getOfferingsSku(offerings))).to.eql(null);
    });

    it('should return global value (all skus are same)', () => {
      const offerings = fromJS([
        { sku: 'qwe', visibility: true },
        { sku: 'qwe', visibility: true },
        { sku: 'qwe', visibility: true }
      ]);

      expect((getOfferingsSku(offerings))).to.eql('qwe');
    });

    it('should use only visible skus', () => {
      const offerings = fromJS([
        { sku: 'qwe', visibility: true },
        { sku: 'asd', visibility: false },
        { sku: 'qwe', visibility: true }
      ]);

      expect((getOfferingsSku(offerings))).to.eql('qwe');
    });
  });

  describe('getSku', () => {
    let getSku;
    let product;

    beforeEach(() => {
      getSku = variationsInventory.__get__('getSku');
      product = fromJS({});
    });

    it('should keep offering value', () => {
      expect(getSku(product, fromJS([]), 'offering value')).to.eql('offering value');
    });

    it('should get offering value if new variations are influencing sku', () => {
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: true}]), '')).to.eql('');
    });

    it('should get null if there are no existing variations', () => {
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: false}]))).to.eql('');
    });

    it('should get sku from existing offerings if their values are same', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesSku: true}, {id: 2, influencesSku: false}]))
        .set('productOfferings', fromJS([
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: false}]))).to.eql('test sku');
    });

    it('should get null if existing offerings have not same values', () => {
      product = product
        .set('variations', fromJS([{id: 1, influencesSku: true}, {id: 2, influencesSku: false}]))
        .set('productOfferings', fromJS([
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 21, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 22, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 11, variationId: 1}, {optionId: 23, variationId: 2}]},
          {sku: 'test skuuuu', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 21, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 22, variationId: 2}]},
          {sku: 'test sku', variationOptions: [{optionId: 12, variationId: 1}, {optionId: 23, variationId: 2}]}
        ]));
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: false}]))).to.eql('');
    });

    it('should pass global value as is if during inline editing', () => {
      product = product.set('variations', fromJS([{influencesSku: false}, {influencesSku: false}]));
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: false}]), '', true)).to.eql('');
    });

    it('should pass empty string', () => {
      product = product.set('variations', fromJS([{influencesSku: false}, {influencesSku: false}]));
      expect(getSku(product, fromJS([{influencesSku: false}, {influencesSku: false}]), '')).to.eql('');
    });
  });

  describe('getValue', () => {
    let getValue;
    let getPrice;

    beforeEach(() => {
      getPrice = sinon.stub();
      variationsInventory.__Rewire__('getPrice', getPrice);
      getValue = variationsInventory.__get__('getValue');
    });

    afterEach(() => {
      variationsInventory.__ResetDependency__('getPrice');
    });

    it('should pass value', () => {
      getPrice.returns('42');

      expect(getValue('price')).to.eql('42');
    });

    it('should keep null', () => {
      getPrice.returns(null);

      expect(getValue('price')).to.eql(null);
    });
  });
});
