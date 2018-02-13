import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';

chai.use(sinonChai);

import * as productOfferings from './productOfferingsImm';

describe('productOfferings', () => {
  describe('getOfferingsData', () => {
    let getOfferingsData;
    let getOfferings;
    let getOfferingsColumns;
    let getNumOfInfluences;

    beforeEach(() => {
      getOfferings = sinon.stub();
      getOfferingsColumns = sinon.stub();
      getNumOfInfluences = sinon.stub();
      productOfferings.__Rewire__('getOfferings', getOfferings);
      productOfferings.__Rewire__('getOfferingsColumns', getOfferingsColumns);
      productOfferings.__Rewire__('getNumOfInfluences', getNumOfInfluences);
      getOfferingsData = productOfferings.__get__('getOfferingsData');
    });

    afterEach(() => {
      productOfferings.__ResetDependency__('getOfferings');
      productOfferings.__ResetDependency__('getOfferingsColumns');
      productOfferings.__ResetDependency__('getNumOfInfluences');
    });

    it('should do nothing for unknown type', () => {
      expect(getOfferingsData()).to.eql(null);
      expect(getOfferingsData(0)).to.eql(null);
      expect(getOfferingsData('type')).to.eql(null);
    });

    it('should return offerings metadata', () => {
      getOfferings.returns(fromJS([]));
      getNumOfInfluences.returns(0);

      const result = getOfferingsData(1, fromJS({}), fromJS([]), true).toJS();

      expect(result).to.be.defined;
      expect(getOfferings).to.have.been.calledOnce;
      expect(result.type).to.eql('price');
      expect(result.influencesType).to.eql('influencesPrice');
      expect(getOfferingsColumns).to.have.been.calledWithExactly(1, fromJS([]), fromJS([]), fromJS([]));
      expect(result.offerings).to.eql([]);
      expect(result.variations).to.eql([]);
      expect(result.showGlobalValue).to.eql(true);
      expect(result.globalValue).to.eql('');
      expect(result.globalValueLabel).to.eql('Price');
      expect(result.numOfInfluences).to.eql(0);
      expect(result.checkboxes).to.eql([]);
    });

    it('should not set showGlobalValue', () => {
      getOfferings.returns(fromJS([]));
      getNumOfInfluences.returns(1);

      const result = getOfferingsData(1).toJS();
      expect(result.showGlobalValue).to.eql(false);
      expect(result.numOfInfluences).to.eql(1);
    });
  });

  describe('getCombinations', () => {
    let getCombinations;

    beforeEach(() => {
      getCombinations = productOfferings.__get__('getCombinations');
    });

    it('should handle empty options array', () => {
      const result = getCombinations().toJS();
      expect(result).to.eql([]);
    });

    it('should return combinations', () => {
      const options = fromJS([
        [{firstId: 1}, {firstId: 2}, {firstId: 3}],
        [{secondId: 1}, {secondId: 2}]
      ]);
      const result = getCombinations(options).toJS();

      expect(result).to.eql([
        [{firstId: 1}, {secondId: 1}],
        [{firstId: 1}, {secondId: 2}],
        [{firstId: 2}, {secondId: 1}],
        [{firstId: 2}, {secondId: 2}],
        [{firstId: 3}, {secondId: 1}],
        [{firstId: 3}, {secondId: 2}]
      ]);
    });
  });

  describe('getOfferings', () => {
    let getOfferings;
    let getCombinations;
    let guid;

    beforeEach(() => {
      guid = 1;
      getCombinations = sinon.stub();
      productOfferings.__Rewire__('getCombinations', getCombinations);
      productOfferings.__Rewire__('getGUID', () => guid++);
      getOfferings = productOfferings.__get__('getOfferings');
    });

    afterEach(() => {
      productOfferings.__ResetDependency__('getCombinations');
      productOfferings.__ResetDependency__('getGUID');
    });

    it('should handle empty variations', () => {
      const result = getOfferings(fromJS({})).toJS();

      expect(result).to.eql([]);
    });

    it('should return offerings', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, options: [{id: 11}, {id: 12}] },
          { id: 200, options: [{id: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);
    });

    it('should copy old values', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}] },
          { id: 200, options: [{id: 21}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);
    });

    it('should copy old values and use nulls for ones we do not have yet drop those we do not have anymore', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}, {id: 13}] },
          { id: 200, options: [{id: 21}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
          { id: -4, price: '7', quantity: '8', sku: '9', visibility: true, variationOptions: [{variationId: 100, optionId: 14}, {variationId: 200, optionId: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]}
      ]);
    });

    it('should copy old values from one pair to multiple pairs (added second variation)', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}, {id: 13}] },
          { id: 200, options: [{id: 21}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}] },
          { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}] },
          { id: -4, price: '7', quantity: '8', sku: '9', visibility: true, variationOptions: [{variationId: 100, optionId: 14}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]}
      ]);
    });

    it('should copy global values to new options', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, options: [{id: 11}, {id: 12}, {id: 13}] },
          { id: 200, options: [{id: 21}] }
        ],
        offerings: [
          { id: -2, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 12}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 13}, {variationId: 200, optionId: 21}]}
      ]);
    });

    it('should copy old values from first influencig variation', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}] },
          { id: 200, options: [{id: 21}, {id: 22}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -4, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}]},
        { id: -4, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]}
      ]);
    });

    it('should copy old values from second influencig variation', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, options: [{id: 11}, {id: 12}] },
          { id: 200, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 21}, {id: 22}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -4, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}]},
        { id: -4, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]}
      ]);
    });

    it('should set null for new combination', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}] },
          { id: 200, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 21}, {id: 22}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -4, price: '2', quantity: '3', sku: '4', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '2', quantity: '3', sku: '4', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] },
        { id: -3, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}]},
        { id: -4, price: null, quantity: null, sku: null, visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 22}]}
      ]);
    });

    it('should copy old visibility value', () => {
      const combinations = fromJS([
        [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}],
        [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}]
      ]);
      getCombinations.returns(combinations);

      const newValue = fromJS({
        variations: [
          { id: 100, influencesPrice: true, influencesQuantity: true, influencesSku: true, options: [{id: 11}, {id: 12}] },
          { id: 200, options: [{id: 21}] }
        ],
        offerings: [
          { id: -1, price: '1', quantity: '2', sku: '3', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ]
      });

      const result = getOfferings(newValue).toJS();

      expect(result).to.eql([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);
    });
  });

  describe('updateVisibility', () => {
    let updateVisibility;

    beforeEach(() => {
      updateVisibility = productOfferings.__get__('updateVisibility');
    });

    describe('two separate lists', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS({1: {influencesPrice: true}, 2: {}});
      });

      it('should copy values from previous offerings', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should copy values from previous offerings to newly added options on influencing property', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should copy values from previous offerings to newly added options on non-influencing property', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 23}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 23}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should ignore values from previous offerings when option is removed from influencing property', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should ignore values from previous offerings when option is removed from non-influencing property', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 23}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });
    });

    describe('combination list', () => {
      let variations;

      beforeEach(() => {
        variations = fromJS({1: {influencesPrice: true}, 2: {influencesPrice: true}});
      });

      it('should copy values from previous offerings', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should set true for new combinations', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 23}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 23}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });

      it('should ignore values from previous offerings for deleted options', () => {
        const offerings = fromJS([
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ]);

        const oldOfferings = fromJS([
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]},
          { visibility: true, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 12}, {variationId: 2, optionId: 22}]}
        ]);

        const expected = [
          { visibility: true, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 21}]},
          { visibility: false, variationOptions: [{variationId: 1, optionId: 11}, {variationId: 2, optionId: 22}]}
        ];

        expect(updateVisibility(variations, offerings, oldOfferings).toJS()).to.eql(expected);
      });
    });
  });

  describe('updateValues', () => {
    let updateValues;
    let getInfluencingData;
    let guid;
    let variations = fromJS([{}, {}]);
    let offerings = fromJS([{}, {}, {}]);
    let oldVariations = fromJS([{}, {}]);
    let oldOfferings = fromJS([{}, {}, {}]);

    beforeEach(() => {
      guid = 1;
      getInfluencingData = sinon.stub();
      productOfferings.__Rewire__('getInfluencingData', getInfluencingData);
      productOfferings.__Rewire__('getGUID', () => guid++);
      updateValues = productOfferings.__get__('updateValues');
    });

    afterEach(() => {
      productOfferings.__ResetDependency__('getInfluencingData');
      productOfferings.__ResetDependency__('getGUID');
    });

    describe('global value', () => {
      beforeEach(() => {
        getInfluencingData.returns({ isGlobal: true });
      });

      it('should set values to null as global value', () => {
        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([{ price: null }, { price: null }, { price: null }]);
      });

      it('should set values to default value as global value', () => {
        const result = updateValues('visibility', null, variations, offerings, oldVariations, oldOfferings, true).toJS();

        expect(result).to.eql([{ visibility: true }, { visibility: true }, { visibility: true }]);
      });

      it('should use first nonempty value as global value', () => {
        oldOfferings = fromJS([{}, { price: '3.14' }, {}]);
        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([{ price: '3.14' }, { price: '3.14' }, { price: '3.14' }]);
      });

      // if new option is added, global value is not changed. new offering combination will be set to global value
      it('should set same value when new offering is added', () => {
        offerings = fromJS([{}, {}, {}]);
        oldOfferings = fromJS([{}, { price: '3.14' }]);
        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([{ price: '3.14' }, { price: '3.14' }, { price: '3.14' }]);
      });

      // if existing option is removed. global value is not changed. offering combination for this option will be removed
      it('should keep same value when offering is removed', () => {
        offerings = fromJS([{}, {}]);
        oldOfferings = fromJS([{ price: '3.14' }, { price: '3.14' }, { price: '3.14' }]);
        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([{ price: '3.14' }, { price: '3.14' }]);
      });

      // if variation is set to have global value and user checks influencing flag, value in all offering combinations will remain same (are set to global value)
      it('should copy global value if incluences flag is set - one variation', () => {
        getInfluencingData.onFirstCall().returns({ isGlobal: false, influencesAll: false, optionIndex: 0 });
        getInfluencingData.onSecondCall().returns({ isGlobal: true });

        variations = fromJS([{}]);
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }] },
          { variationOptions: [{ optionId: 12 }] }
        ]);
        oldVariations = fromJS([{}]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }] }
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }] }
        ]);
      });

      // if variations are set to have global value and user checks one influencing flag, value in all offering combinations will remain same (are set to global value)
      it('should copy global value if incluences flag is set - two variations', () => {
        getInfluencingData.onFirstCall().returns({ isGlobal: false, influencesAll: false, optionIndex: 0 });
        getInfluencingData.onSecondCall().returns({ isGlobal: true });

        variations = fromJS([{}, {}]);
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);
        oldVariations = fromJS([{}, {}]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);
      });

      // if variation has influencing flag set and then user un-checks it, global value and value in all offering combinations will be set according to "create new variations" section
      it('should keep values if incluences flag is unset - one variation', () => {
        getInfluencingData.onFirstCall().returns({ isGlobal: true });
        getInfluencingData.onSecondCall().returns({ isGlobal: false, influencesAll: false, optionIndex: 0 });

        variations = fromJS([{}]);
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }] },
          { variationOptions: [{ optionId: 12 }] }
        ]);
        oldVariations = fromJS([{}]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }] }
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }] }
        ]);
      });

      // if variations are set to have one influencing variation and user un-checks it, global value and value in all offering combinations will be set according to "create new variations" section
      it('should keep values if incluences flag is unset - two variations', () => {
        getInfluencingData.onFirstCall().returns({ isGlobal: true });
        getInfluencingData.onSecondCall().returns({ isGlobal: false, influencesAll: false, optionIndex: 0 });

        variations = fromJS([{}, {}]);
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);
        oldVariations = fromJS([{}, {}]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }] },
          { price: '3.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }] }
        ]);
      });
    });

    describe('only one variation is influencing value', () => {
      beforeEach(() => {
        getInfluencingData.returns({ isGlobal: false, influencesAll: false, optionIndex: 0 });
      });

      it('should copy old values to new offerings', () => {
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
      });

      // if new option is added to influencing variation, value in new offering combinations for this option will be set to null
      it('should use default value for added offering to influencing variations', () => {
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]}
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings, 'test').toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: 'test', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: 'test', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
      });

      // if new option is added to non-influencing variation, value in new offering combinations for this option will be set to values from offering combinations containing influencing option
      it('should copy value for added offering to non-influencing variations', () => {
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]}
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings, 'test').toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
      });
    });

    describe('both variations are influencing value', () => {
      beforeEach(() => {
        getInfluencingData.returns({ influencesAll: true });
      });

      it('should copy old values to new offerings', () => {
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '4.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: '6.14', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings).toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '4.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: '5.14', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: '6.14', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
      });

      it('should use default value for new offerings when missing data', () => {
        offerings = fromJS([
          { variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
        oldOfferings = fromJS([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '4.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]}
        ]);

        const result = updateValues('price', 'infulencesPrice', variations, offerings, oldVariations, oldOfferings, 'test').toJS();

        expect(result).to.eql([
          { price: '3.14', variationOptions: [{ optionId: 11 }, { optionId: 21 }]},
          { price: '4.14', variationOptions: [{ optionId: 11 }, { optionId: 22 }]},
          { price: 'test', variationOptions: [{ optionId: 12 }, { optionId: 21 }]},
          { price: 'test', variationOptions: [{ optionId: 12 }, { optionId: 22 }]}
        ]);
      });
    });
  });

  describe('getNumOfInfluences', () => {
    let getNumOfInfluences;

    beforeEach(() => {
      getNumOfInfluences = productOfferings.__get__('getNumOfInfluences');
    });

    it('should return correct number of variation influencing specific type', () => {
      const variations = fromJS([
        { influencesPrice: true },
        { influencesPrice: false },
        { influencesPrice: true },
        { influencesPrice: false }
      ]);
      expect(getNumOfInfluences(1, variations)).to.eql(2);
    });
  });

  describe('getOfferingsColumns', () => {
    let getOfferingsColumns;
    let getNumOfInfluences;
    let getSingleVariationList;
    let getCombinationsList;

    beforeEach(() => {
      getNumOfInfluences = sinon.stub();
      getSingleVariationList = sinon.stub();
      getCombinationsList = sinon.stub();
      productOfferings.__Rewire__('getNumOfInfluences', getNumOfInfluences);
      productOfferings.__Rewire__('getSingleVariationList', getSingleVariationList);
      productOfferings.__Rewire__('getCombinationsList', getCombinationsList);
      getOfferingsColumns = productOfferings.__get__('getOfferingsColumns');
    });

    afterEach(() => {
      productOfferings.__ResetDependency__('getNumOfInfluences');
      productOfferings.__ResetDependency__('getSingleVariationList');
      productOfferings.__ResetDependency__('getCombinationsList');
    });

    it('should get lists for individual variations', () => {
      const variations = fromJS([{formattedName: 'Price'}]);
      const offerings = fromJS([]);
      const status = fromJS([]);
      getNumOfInfluences.returns(0);

      const result = getOfferingsColumns(1, variations, offerings, status).toJS();

      expect(getSingleVariationList).have.been.calledWithExactly(1, fromJS({formattedName: 'Price'}), offerings, status);
      expect(getCombinationsList).not.have.been.called;
      expect(result[0].headers).to.eql(['Price']);
    });

    it('should get lists for individual variations without properties which do not influence type', () => {
      const variations = fromJS([{formattedName: 'Price', influencesPrice: true}, {formattedName: 'Quantity'}]);
      const offerings = fromJS([]);
      getNumOfInfluences.returns(0);

      const result = getOfferingsColumns(1, variations, offerings, false).toJS();

      expect(getSingleVariationList).have.been.calledWithExactly(1, fromJS({formattedName: 'Price', influencesPrice: true}), offerings, false);
      expect(getCombinationsList).not.have.been.called;
      expect(result[0].headers).to.eql(['Price']);
    });

    it('should get lists for combined variations', () => {
      const variations = fromJS([{formattedName: 'Price'}, {formattedName: 'Color'}]);
      const offerings = fromJS([]);
      const status = fromJS([]);
      getNumOfInfluences.returns(2);

      const result = getOfferingsColumns(1, variations, offerings, status).toJS();

      expect(getCombinationsList).have.been.calledWithExactly(1, variations, offerings, status);
      expect(getSingleVariationList).not.have.been.called;
      expect(result[0].headers).to.eql(['Price', 'Color']);
    });
  });

  describe('getCombinationsList', () => {
    let getCombinationsList;

    beforeEach(() => {
      getCombinationsList = productOfferings.__get__('getCombinationsList');
    });

    it('should get Combinations List', () => {
      const variations = fromJS([
        { id: 100, options: [{id: 11}, {id: 12}] },
        { id: 200, options: [{id: 21}] }
      ]);
      const offerings = fromJS([
        { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);

      const result = getCombinationsList(1, variations, offerings).toJS();

      expect(result).to.eql([
        { value: '1', _formattedValue: 'fmt1', showValue: true, status: null, visible: true, combination: [
          { optionId: 11, variationId: 100, option: {id: 11}, variation: { id: 100, options: [{id: 11}, {id: 12}] }, showValue: false },
          { optionId: 21, variationId: 200, option: {id: 21}, variation: { id: 200, options: [{id: 21}] }, showValue: false }
        ]},
        { value: '4', _formattedValue: 'fmt2', showValue: true, status: null, visible: true, combination: [
          { optionId: 12, variationId: 100, option: {id: 12}, variation: { id: 100, options: [{id: 11}, {id: 12}] }, showValue: false },
          { optionId: 21, variationId: 200, option: {id: 21}, variation: { id: 200, options: [{id: 21}] }, showValue: false }
        ]}
      ]);
    });

    it('should get Combinations List with status', () => {
      const variations = fromJS([
        { id: 100, options: [{id: 11}, {id: 12}] },
        { id: 200, options: [{id: 21}] }
      ]);
      const offerings = fromJS([
        { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);

      const status = fromJS(['some error', 'another error']);

      const result = getCombinationsList(1, variations, offerings, status).toJS();

      expect(result).to.eql([
        { value: '1', _formattedValue: 'fmt1', showValue: true, status: 'some error', visible: true, combination: [
          { optionId: 11, variationId: 100, option: {id: 11}, variation: { id: 100, options: [{id: 11}, {id: 12}] }, showValue: false },
          { optionId: 21, variationId: 200, option: {id: 21}, variation: { id: 200, options: [{id: 21}] }, showValue: false }
        ]},
        { value: '4', _formattedValue: 'fmt2', showValue: true, status: 'another error', visible: true, combination: [
          { optionId: 12, variationId: 100, option: {id: 12}, variation: { id: 100, options: [{id: 11}, {id: 12}] }, showValue: false },
          { optionId: 21, variationId: 200, option: {id: 21}, variation: { id: 200, options: [{id: 21}] }, showValue: false }
        ]}
      ]);
    });
  });

  describe('getSingleVariationList', () => {
    let getSingleVariationList;

    beforeEach(() => {
      getSingleVariationList = productOfferings.__get__('getSingleVariationList');
    });

    it('should get Single List', () => {
      const variation = fromJS({ id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true });
      const offerings = fromJS([
        { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);

      const result = getSingleVariationList(1, variation, offerings).toJS();

      expect(result).to.eql([
        { value: '1', _formattedValue: 'fmt1', showValue: false, status: null, visible: true, combination: [
          { optionId: 11, variationId: 100, option: {id: 11}, variation: { id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true }, showValue: true }
        ]},
        { value: '4', _formattedValue: 'fmt2', showValue: false, status: null, visible: true, combination: [
          { optionId: 12, variationId: 100, option: {id: 12}, variation: { id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true }, showValue: true }
        ]}
      ]);
    });

    it('should get Single List with status', () => {
      const variation = fromJS({ id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true });
      const offerings = fromJS([
        { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
      ]);
      const status = fromJS(['some error', 'another error']);

      const result = getSingleVariationList(1, variation, offerings, status).toJS();

      expect(result).to.eql([
        { value: '1', _formattedValue: 'fmt1', showValue: false, status: 'some error', visible: true, combination: [
          { optionId: 11, variationId: 100, option: {id: 11}, variation: { id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true }, showValue: true }
        ]},
        { value: '4', _formattedValue: 'fmt2', showValue: false, status: 'another error', visible: true, combination: [
          { optionId: 12, variationId: 100, option: {id: 12}, variation: { id: 100, options: [{id: 11}, {id: 12}], influencesPrice: true }, showValue: true }
        ]}
      ]);
    });
  });

  describe('getOfferingsList', () => {
    let getOfferingsList;

    beforeEach(() => {
      getOfferingsList = productOfferings.__get__('getOfferingsList');
    });

    it('should get list for global value', () => {
      const product = fromJS({
        variations: [
          { id: 100, influencesQuantity: false, options: [{id: 11}, {id: 12}] },
          { id: 200, influencesQuantity: false, options: [{id: 21}] }
        ],
        productOfferings: [
          { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { index: -2, price: '4', quantity: '2', sku: '6', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ],
        _status: {
          data: {status: 'some error', offerings: ['error1', 'error2']}
        }
      });

      const result = getOfferingsList(2, product).toJS();

      expect(result).to.eql({
        showValue: true,
        value: '2',
        _formattedValue: 'fmt1',
        status: 'error1',
        globalStatus: 'some error',
        items: []
      });
    });

    it('should get list for single influenced property', () => {
      const product = fromJS({
        variations: [
          { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11', label: 'label11'}, {id: 12, value: 'label12', label: 'label12'}] },
          { id: 200, influencesQuantity: false, options: [{id: 21, value: 'label21', label: 'label21'}] }
        ],
        productOfferings: [
          { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ],
        _status: {
          data: {status: 'some error', offerings: ['error1', 'error2']}
        }
      });

      const result = getOfferingsList(2, product).toJS();

      expect(result).to.eql({
        showValue: false,
        value: null,
        _formattedValue: null,
        status: null,
        globalStatus: 'some error',
        items: [
          { value: '2', _formattedValue: 'fmt1', showValue: false, status: 'error1', visible: true, combination: [
            { optionId: 11, variationId: 100, option: {id: 11, value: 'label11', label: 'label11'}, variation: { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11', label: 'label11'}, {id: 12, value: 'label12', label: 'label12'}] }, showValue: true }
          ]},
          { value: '5', _formattedValue: 'fmt2', showValue: false, status: 'error2', visible: true, combination: [
            { optionId: 12, variationId: 100, option: {id: 12, value: 'label12', label: 'label12'}, variation: { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11', label: 'label11'}, {id: 12, value: 'label12', label: 'label12'}] }, showValue: true }
          ]}
        ]
      });
    });

    it('should get list for combined influenced properties', () => {
      const product = fromJS({
        variations: [
          { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11'}, {id: 12, value: 'label12'}] },
          { id: 200, influencesQuantity: true, options: [{id: 21, value: 'label21'}] }
        ],
        productOfferings: [
          { index: -1, price: '1', quantity: '2', sku: '3', _formattedValue: 'fmt1', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
          { index: -2, price: '4', quantity: '5', sku: '6', _formattedValue: 'fmt2', visibility: true, variationOptions: [{variationId: 100, optionId: 12}, {variationId: 200, optionId: 21}] }
        ],
        _status: {
          data: {status: 'some error', offerings: ['error1', 'error2']}
        }
      });

      const result = getOfferingsList(2, product).toJS();

      expect(result).to.eql({
        showValue: false,
        value: null,
        _formattedValue: null,
        status: null,
        globalStatus: 'some error',
        items: [
          { value: '2', _formattedValue: 'fmt1', showValue: true, status: 'error1', visible: true, combination: [
            { optionId: 11, variationId: 100, option: {id: 11, value: 'label11', label: 'label11'}, variation: { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11', label: 'label11'}, {id: 12, value: 'label12', label: 'label12'}] }, showValue: false },
            { optionId: 21, variationId: 200, option: {id: 21, value: 'label21', label: 'label21'}, variation: { id: 200, influencesQuantity: true, options: [{id: 21, value: 'label21', label: 'label21'}] }, showValue: false }
          ]},
          { value: '5', _formattedValue: 'fmt2', showValue: true, status: 'error2', visible: true, combination: [
            { optionId: 12, variationId: 100, option: {id: 12, value: 'label12', label: 'label12'}, variation: { id: 100, influencesQuantity: true, options: [{id: 11, value: 'label11', label: 'label11'}, {id: 12, value: 'label12', label: 'label12'}] }, showValue: false },
            { optionId: 21, variationId: 200, option: {id: 21, value: 'label21', label: 'label21'}, variation: { id: 200, influencesQuantity: true, options: [{id: 21, value: 'label21', label: 'label21'}] }, showValue: false }
          ]}
        ]
      });
    });
  });

  describe('getCheckboxes', () => {
    let getCheckboxes;

    beforeEach(() => {
      getCheckboxes = productOfferings.__get__('getCheckboxes');
    });

    it('it should get checkboxes', () => {
      const variations = fromJS([
        { id: 100, influencesQuantity: true, options: [{id: 11}, {id: 12}] },
        { id: 200, influencesQuantity: false, options: [] }
      ]);

      const result = getCheckboxes(2, variations).toJS();
      expect(result).to.eql([
        { id: 100, checked: true, disabled: false, label: 'Quantity' },
        { id: 200, checked: false, disabled: true, label: 'Quantity' }
      ]);
    });

    it('it should get empty array for visibility tab', () => {
      const variations = fromJS([
        { id: 100, influencesQuantity: true, options: [{id: 11}, {id: 12}] },
        { id: 200, influencesQuantity: false, options: [] }
      ]);

      const result = getCheckboxes(4, variations).toJS();
      expect(result).to.eql([]);
    });
  });

  describe('isVisible', () => {
    let isVisible;

    beforeEach(() => {
      isVisible = productOfferings.__get__('isVisible');
    });

    it('should return true for visibility tab', () => {
      const result = isVisible(4, null, true);

      expect(result).to.eql(true);
    });

    it('should return offering visibility for combinations', () => {
      expect(isVisible(1, fromJS({ visibility: true }), false)).to.eql(true);
      expect(isVisible(1, fromJS({ visibility: false }), false)).to.eql(false);
    });

    it('should return true if any of the combinations is visible', () => {
      const combination = fromJS({variationId: 100, optionId: 11});
      const allOfferings = fromJS([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: true, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}] },
        { id: -4, price: '7', quantity: '8', sku: '9', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 23}] }
      ]);
      const result = isVisible(1, null, true, combination, allOfferings);

      expect(result).to.eql(true);
    });

    it('should return false if all of the combinations are not visible', () => {
      const combination = fromJS({variationId: 100, optionId: 11});
      const allOfferings = fromJS([
        { id: -1, price: '1', quantity: '2', sku: '3', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 21}] },
        { id: -2, price: '4', quantity: '5', sku: '6', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 22}] },
        { id: -4, price: '7', quantity: '8', sku: '9', visibility: false, variationOptions: [{variationId: 100, optionId: 11}, {variationId: 200, optionId: 23}] }
      ]);
      const result = isVisible(1, null, true, combination, allOfferings);

      expect(result).to.eql(false);
    });
  });

  describe('getValue', () => {
    let getValue;

    beforeEach(() => {
      getValue = productOfferings.__get__('getValue');
    });

    it('should get number', () => {
      expect(getValue(1, 0)).to.eql(0);
    });

    it('should get string', () => {
      expect(getValue(1, 'test')).to.eql('test');
    });

    it('should get empty string', () => {
      expect(getValue(1, '')).to.eql('');
      expect(getValue(1)).to.eql('');
    });

    it('should get boolean', () => {
      expect(getValue(4, false)).to.eql(false);
      expect(getValue(4, true)).to.eql(true);
      expect(getValue(4)).to.eql(true);
    });
  });

  describe('isInfluencingType', () => {
    let isInfluencingType;

    beforeEach(() => {
      isInfluencingType = productOfferings.__get__('isInfluencingType');
    });

    it('should get influencing flag', () => {
      expect(isInfluencingType(1, fromJS({ influencesPrice: true }))).to.eql(true);
      expect(isInfluencingType(1, fromJS({ influencesPrice: false }))).to.eql(false);
      expect(isInfluencingType(1, fromJS({ influencesQuantity: true }))).to.eql(false);
    });

    it('should get true vor visibility', () => {
      expect(isInfluencingType(4, fromJS({}))).to.eql(true);
    });
  });

  describe('getNumOfInfluences', () => {
    let getNumOfInfluences;

    beforeEach(() => {
      getNumOfInfluences = productOfferings.__get__('getNumOfInfluences');
    });

    it('should get number of influences for non-visibility tab', () => {
      expect(getNumOfInfluences(1, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(0);
      expect(getNumOfInfluences(1, fromJS([{influencesPrice: false}, {influencesPrice: true}]))).to.eql(1);
      expect(getNumOfInfluences(1, fromJS([{influencesPrice: true}, {influencesPrice: false}]))).to.eql(1);
      expect(getNumOfInfluences(1, fromJS([{influencesPrice: true}, {influencesPrice: true}]))).to.eql(2);
    });

    it('should get number of variation for visibility tab', () => {
      const variations = fromJS([
        {influencesPrice: false, influencesQuantity: true, influencesSku: true},
        {influencesPrice: true, influencesQuantity: false, influencesSku: true}
      ]);
      expect(getNumOfInfluences(4, fromJS([{influencesPrice: true}, {influencesPrice: true}]))).to.eql(2);
      expect(getNumOfInfluences(4, variations)).to.eql(2);
    });

    it('should get 0 for visibility tab', () => {
      expect(getNumOfInfluences(4, fromJS([{influencesPrice: false}, {influencesPrice: true}]))).to.eql(0);
      expect(getNumOfInfluences(4, fromJS([{influencesPrice: true}, {influencesPrice: false}]))).to.eql(0);
      expect(getNumOfInfluences(4, fromJS([{influencesPrice: false}, {influencesPrice: false}]))).to.eql(0);
    });
  });
});
