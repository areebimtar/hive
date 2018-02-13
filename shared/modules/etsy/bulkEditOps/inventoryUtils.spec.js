import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import * as inventoryUtils from './inventoryUtils';

describe('inventoryUtils', () => {
  describe('applyOp', () => {
    it('should apply global value', () => {
      const opValue = fromJS({ index: null, combination: null, value: 'newValue' });
      const opFn = sinon.stub().returns('newValue');
      const product = fromJS({
        productOfferings: [
          {typeName: 'qwe', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'asd', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'zxc', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
        ]
      });
      const result = inventoryUtils.applyOp('op', 'typeName', product, opValue, false, opFn);

      expect(opFn).to.have.been.calledThrice;
      expect(result.get('productOfferings').toJS()).to.eql([
          {typeName: 'newValue', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'newValue', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'newValue', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
      ]);
    });

    it('should apply combination value', () => {
      const opValue = fromJS({ index: null, combination: { variationId: -1, optionId: -1 }, value: 'newValue' });
      const opFn = sinon.stub().returns('newValue');
      const product = fromJS({
        productOfferings: [
          {typeName: 'qwe', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'asd', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'zxc', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
        ]
      });
      const result = inventoryUtils.applyOp('op', 'typeName', product, opValue, false, opFn);

      expect(opFn).to.have.been.calledTwice;
      expect(result.get('productOfferings').toJS()).to.eql([
        {typeName: 'newValue', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
        {typeName: 'asd', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
        {typeName: 'newValue', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
      ]);
    });

    it('should apply value for specific combination only', () => {
      const opValue = fromJS({ index: 1, combination: null, value: 'newValue' });
      const opFn = sinon.stub().returns('newValue');
      const product = fromJS({
        productOfferings: [
          {typeName: 'qwe', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'asd', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
          {typeName: 'zxc', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
        ]
      });
      const result = inventoryUtils.applyOp('op', 'typeName', product, opValue, false, opFn);

      expect(opFn).to.have.been.calledOnce;
      expect(result.get('productOfferings').toJS()).to.eql([
        {typeName: 'qwe', variationOptions: [{ variationId: -1, optionId: -1 }, { variationId: -2, optionId: -1 }]},
        {typeName: 'newValue', variationOptions: [{ variationId: -1, optionId: -2 }, { variationId: -2, optionId: -1 }]},
        {typeName: 'zxc', variationOptions: [{ variationId: -3, optionId: -1 }, { variationId: -1, optionId: -1 }]}
      ]);
    });
  });

  describe('updateVariationsCheckboxes', () => {
    it('should check property on single variation', () => {
      const variations = fromJS([
        { influencesPrice: false, influencesQuantity: false, influencesSku: false }
      ]);

      const result = inventoryUtils.updateVariationsCheckboxes(variations, 0, 'influencesPrice', true).toJS();

      expect(result).to.eql([
        { influencesPrice: true, influencesQuantity: false, influencesSku: false }
      ]);
    });

    it('should un-check property on single variation', () => {
      const variations = fromJS([
        { influencesPrice: true, influencesQuantity: true, influencesSku: true }
      ]);

      const result = inventoryUtils.updateVariationsCheckboxes(variations, 0, 'influencesPrice', false).toJS();

      expect(result).to.eql([
        { influencesPrice: false, influencesQuantity: true, influencesSku: true }
      ]);
    });

    it('should check both checkboxes if threre is both influencing property', () => {
      for (let index = 0; index < 2; ++index) {
        const variations = fromJS([
          { influencesPrice: false, influencesQuantity: true, influencesSku: false },
          { influencesPrice: false, influencesQuantity: true, influencesSku: false }
        ]);

        const result = inventoryUtils.updateVariationsCheckboxes(variations, index, 'influencesPrice', true).toJS();

        expect(result).to.eql([
          { influencesPrice: true, influencesQuantity: true, influencesSku: false },
          { influencesPrice: true, influencesQuantity: true, influencesSku: false }
        ]);
      }
    });

    it('should un-check both checkboxes if threre is both influencing property', () => {
      for (let index = 0; index < 2; ++index) {
        const variations = fromJS([
          { influencesPrice: true, influencesQuantity: true, influencesSku: false },
          { influencesPrice: true, influencesQuantity: true, influencesSku: false }
        ]);

        const result = inventoryUtils.updateVariationsCheckboxes(variations, index, 'influencesPrice', false).toJS();

        expect(result).to.eql([
          { influencesPrice: false, influencesQuantity: true, influencesSku: false },
          { influencesPrice: false, influencesQuantity: true, influencesSku: false }
        ]);
      }
    });

    it('should un-check only selected checkbox if it is last both influencing property', () => {
      for (let index = 0; index < 2; ++index) {
        const variations = fromJS([
          { influencesPrice: true, influencesQuantity: false, influencesSku: false },
          { influencesPrice: true, influencesQuantity: false, influencesSku: false }
        ]);

        const result = inventoryUtils.updateVariationsCheckboxes(variations, index, 'influencesPrice', false).toJS();

        expect(result).to.eql([
          { influencesPrice: index !== 0, influencesQuantity: false, influencesSku: false },
          { influencesPrice: index !== 1, influencesQuantity: false, influencesSku: false }
        ]);
      }
    });

    it('should check selected checkbox on property when there are no both influencing properties', () => {
      for (let index = 0; index < 2; ++index) {
        const variations = fromJS([
          { influencesPrice: false, influencesQuantity: false, influencesSku: false },
          { influencesPrice: false, influencesQuantity: false, influencesSku: false }
        ]);

        const result = inventoryUtils.updateVariationsCheckboxes(variations, index, 'influencesPrice', true).toJS();

        expect(result).to.eql([
          { influencesPrice: index === 0, influencesQuantity: false, influencesSku: false },
          { influencesPrice: index === 1, influencesQuantity: false, influencesSku: false }
        ]);
      }
    });

    it('should check second selected checkbox on property when there are no both influencing properties', () => {
      const variations = fromJS([
        { influencesPrice: true, influencesQuantity: false, influencesSku: false },
        { influencesPrice: false, influencesQuantity: false, influencesSku: false }
      ]);

      const result = inventoryUtils.updateVariationsCheckboxes(variations, 1, 'influencesPrice', true).toJS();

      expect(result).to.eql([
        { influencesPrice: true, influencesQuantity: false, influencesSku: false },
        { influencesPrice: true, influencesQuantity: false, influencesSku: false }
      ]);
    });

    it('should check second selected checkbox on property when there are no both influencing properties and select second checkbox on other property', () => {
      const variations = fromJS([
        { influencesPrice: true, influencesQuantity: false, influencesSku: false },
        { influencesPrice: false, influencesQuantity: true, influencesSku: false }
      ]);

      const result = inventoryUtils.updateVariationsCheckboxes(variations, 1, 'influencesPrice', true).toJS();

      expect(result).to.eql([
        { influencesPrice: true, influencesQuantity: true, influencesSku: false },
        { influencesPrice: true, influencesQuantity: true, influencesSku: false }
      ]);
    });

    it('should un-check both checkboxes on property when there are both influencing properties', () => {
      const variations = fromJS([
        { influencesPrice: true, influencesQuantity: true, influencesSku: false },
        { influencesPrice: true, influencesQuantity: true, influencesSku: false }
      ]);

      const result = inventoryUtils.updateVariationsCheckboxes(variations, 1, 'influencesPrice', false).toJS();

      expect(result).to.eql([
        { influencesPrice: false, influencesQuantity: true, influencesSku: false },
        { influencesPrice: false, influencesQuantity: true, influencesSku: false }
      ]);
    });
  });
});
