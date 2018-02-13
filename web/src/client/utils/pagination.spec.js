import chai, {expect} from 'chai';
import _ from 'lodash';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as pagination from './pagination';

chai.use(sinonChai);


pagination.__Rewire__('PAGINATION_OFFSET', 20);
pagination.__Rewire__('PAGINATION_MAX_LIMIT', 20);

describe('pagination', () => {
  describe('previousProducts', () => {
    const dispatch = () => {};
    let reduction;

    beforeEach(() => {
      reduction = fromJS({
        ns: {
          products: [],
          filters: {
            offset: 0,
            limit: 20
          }
        }
      });
    });

    it('should update offset', () => {
      reduction = reduction.setIn(['ns', 'filters', 'offset'], 120);
      const update = sinon.spy(dispatch);
      const yields = pagination.previousProducts(reduction, ['ns'], update);

      const effect = yields.next();
      expect(typeof effect.value).to.eql('function');
      effect.value(dispatch);
      expect(effect.done).to.be.false;

      update.should.have.been.calledWithExactly({ offset: 100, limit: 20 });
      expect(yields.next()).to.eql({ value: reduction, done: true });
      expect(yields.next()).to.eql({ value: undefined, done: true });
    });

    it('should not call update if offset is 0', () => {
      const update = sinon.spy(dispatch);

      const yields = pagination.previousProducts(reduction, ['ns'], update);

      const res = yields.next();
      expect(typeof res).not.to.eql('function');
      expect(res).to.eql({ value: reduction, done: true });
    });

    it('should do nothing if update is not provided', () => {
      reduction = reduction.setIn(['ns', 'filters', 'offset'], 120);

      const yields = pagination.previousProducts(reduction, ['ns']);

      const res = yields.next();
      expect(typeof res).not.to.eql('function');
      expect(res).to.eql({ value: reduction, done: true });
    });
  });

  describe('nextProducts', () => {
    const dispatch = () => {};
    let reduction;

    beforeEach(() => {
      reduction = fromJS({
        ns: {
          products: [],
          filters: {
            offset: 0,
            limit: 20
          },
          productsTotal: 100
        }
      });
    });

    it('should update offset', () => {
      const update = sinon.spy(dispatch);
      const yields = pagination.nextProducts(reduction, ['ns'], update);

      const effect = yields.next();
      expect(typeof effect.value).to.eql('function');
      effect.value(dispatch);
      expect(effect.done).to.be.false;

      update.should.have.been.calledWithExactly({ offset: 20, limit: 20 });
      expect(yields.next()).to.eql({ value: reduction, done: true });
      expect(yields.next()).to.eql({ value: undefined, done: true });
    });

    it('should not call update if new offset is past productsTotals', () => {
      reduction = reduction.setIn(['ns', 'filters', 'offset'], 90);
      const update = sinon.spy(dispatch);

      const yields = pagination.nextProducts(reduction, ['ns'], update);

      const res = yields.next();
      expect(typeof res).not.to.eql('function');
      expect(res).to.eql({ value: reduction, done: true });
    });

    it('should do nothing if update is not provided', () => {
      const yields = pagination.nextProducts(reduction, ['ns']);

      const res = yields.next();
      expect(typeof res).not.to.eql('function');
      expect(res).to.eql({ value: reduction, done: true });
    });
  });

  describe('toggleProduct', () => {
    let reduction;

    beforeEach(() => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123' }, { id: '234', selected: true }, { id: '345', selected: false } ],
          selectedProducts: { 234: true, 345: false, selected: 1, selectedAllVisible: false, selectedAll: false }
        }
      });
    });

    it('should set selected flag', () => {
      const productId = '123';

      let products = reduction.getIn(['ns', 'products']).toJS();
      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(products[0].selected).to.be.undefined;
      expect(selectedProducts[productId]).to.be.undefined;
      expect(selectedProducts.selected).to.eql(1);
      expect(selectedProducts.selectedAllVisible).to.be.false;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      products = result.getIn(['ns', 'products']).toJS();
      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(products[0].selected).to.be.true;
      expect(selectedProducts[productId]).to.be.true;
      expect(selectedProducts.selected).to.eql(2);
      expect(selectedProducts.selectedAllVisible).to.be.false;
    });

    it('should clear selected flag', () => {
      const productId = '234';

      let products = reduction.getIn(['ns', 'products']).toJS();
      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(products[1].selected).to.be.true;
      expect(selectedProducts[productId]).to.be.true;
      expect(selectedProducts.selected).to.eql(1);
      expect(selectedProducts.selectedAllVisible).to.be.false;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      products = result.getIn(['ns', 'products']).toJS();
      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(products[1].selected).to.be.false;
      expect(selectedProducts[productId]).to.be.false;
      expect(selectedProducts.selected).to.eql(0);
      expect(selectedProducts.selectedAllVisible).to.be.false;
    });

    it('should set selectedAllVisible flag', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123' }, { id: '234', selected: true } ],
          selectedProducts: { 234: true, selected: 1, selectedAllVisible: false }
        }
      });
      const productId = '123';

      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(selectedProducts.selectedAllVisible).to.be.false;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(selectedProducts.selectedAllVisible).to.be.true;
    });

    it('should clear selectedAllVisible flag', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123', selected: true }, { id: '234', selected: true } ],
          selectedProducts: { 123: true, 234: true, selected: 2, selectedAllVisible: true }
        }
      });
      const productId = '123';

      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(selectedProducts.selectedAllVisible).to.be.true;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(selectedProducts.selectedAllVisible).to.be.false;
    });

    it('should set selectedAll flag', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123' }, { id: '234', selected: true } ],
          productsTotal: 2,
          selectedProducts: { 234: true, selected: 1, selectedAllVisible: false, selectedAll: false }
        }
      });
      const productId = '123';

      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(selectedProducts.selectedAllVisible).to.be.false;
      expect(selectedProducts.selectedAll).to.be.false;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(selectedProducts.selectedAllVisible).to.be.true;
      expect(selectedProducts.selectedAll).to.be.true;
    });

    it('should clear selectedAll flag', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123', selected: true }, { id: '234', selected: true } ],
          productsTotal: 2,
          selectedProducts: { 123: true, 234: true, selected: 2, selectedAllVisible: true, selectedAll: true }
        }
      });
      const productId = '123';

      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(selectedProducts.selectedAllVisible).to.be.true;
      expect(selectedProducts.selectedAll).to.be.true;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(selectedProducts.selectedAllVisible).to.be.false;
      expect(selectedProducts.selectedAll).to.be.false;
    });

    it('should not update state if product is in inline edit mode', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123', selected: true, _inInlineEditing: true }, { id: '234', selected: true } ],
          productsTotal: 2,
          selectedProducts: { 123: true, 234: true, selected: 2, selectedAllVisible: true, selectedAll: true }
        }
      });
      const productId = '123';

      let selectedProducts = reduction.getIn(['ns', 'selectedProducts']).toJS();
      expect(selectedProducts.selectedAllVisible).to.be.true;
      expect(selectedProducts.selectedAll).to.be.true;

      const result = pagination.toggleProduct(reduction, ['ns'], productId);

      selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      expect(selectedProducts.selectedAllVisible).to.be.true;
      expect(selectedProducts.selectedAll).to.be.true;
    });
  });

  describe('toggleAllVisibleProducts', () => {
    let reduction;

    beforeEach(() => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123' }, { id: 234, selected: true }, { id: '345', selected: false } ],
          selectedProducts: { 234: true, 345: false, selected: 1, selectedAllVisible: false }
        }
      });
    });

    it('should set selected flag', () => {
      const result = pagination.toggleAllVisibleProducts(reduction, ['ns']);

      const products = result.getIn(['ns', 'products']).toJS();
      const selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      _.each(products, product => { expect(product.selected).to.be.true; return true; });
      expect(selectedProducts['123']).to.be.true;
      expect(selectedProducts['234']).to.be.true;
      expect(selectedProducts['345']).to.be.true;
      expect(selectedProducts.selected).to.eql(3);
      expect(selectedProducts.selectedAllVisible).to.be.true;
    });

    it('should clear selected flag', () => {
      reduction = fromJS({
        ns: {
          products: [ { id: '123', selected: true }, { id: '234', selected: true }, { id: 345, selected: true } ],
          selectedProducts: { 123: true, 234: true, 345: true, selected: 3, selectedAllVisible: true }
        }
      });

      const result = pagination.toggleAllVisibleProducts(reduction, ['ns']);

      const products = result.getIn(['ns', 'products']).toJS();
      const selectedProducts = result.getIn(['ns', 'selectedProducts']).toJS();

      _.each(products, product => { expect(product.selected).to.be.false; return true; });
      expect(selectedProducts['123']).to.be.false;
      expect(selectedProducts['234']).to.be.false;
      expect(selectedProducts['345']).to.be.false;
      expect(selectedProducts.selected).to.eql(0);
      expect(selectedProducts.selectedAllVisible).to.be.false;
    });
  });

  describe('getPageInfo', () => {
    beforeEach(() => {
      pagination.__Rewire__('PAGINATION_OFFSET', 10);
      pagination.__Rewire__('PAGINATION_INITIAL_LIMIT', 10);
      pagination.__Rewire__('PAGINATION_MAX_LIMIT', 20);
    });

    afterEach(() => {
      pagination.__ResetDependency__('PAGINATION_OFFSET');
      pagination.__ResetDependency__('PAGINATION_INITIAL_LIMIT');
      pagination.__ResetDependency__('PAGINATION_MAX_LIMIT');
    });

    it('should get initial page info', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 0, limit: 10};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.from).to.eql(1);
      expect(pageInfo.to).to.eql(10);
      expect(pageInfo.total).to.eql(productsTotal);
    });

    it('should get page info', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.from).to.eql(21);
      expect(pageInfo.to).to.eql(40);
      expect(pageInfo.total).to.eql(productsTotal);
    });

    it('should limit "To" page info', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 23;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.from).to.eql(21);
      expect(pageInfo.to).to.eql(23);
      expect(pageInfo.total).to.eql(productsTotal);
    });

    it('should show prev button', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showPrev).to.eql(true);
    });

    it('should show next button', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 0, limit: 20};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showNext).to.eql(true);
    });

    it('should format prev button message', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showPrevMsg).to.eql('Show <span class="from">11</span> - <span class="to">31</span> of <span class="total">200</span>');
    });

    it('should format prev button message and handle "From" limit', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 23;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showPrevMsg).to.eql('Show <span class="from">11</span> - <span class="to">23</span> of <span class="total">23</span>');
    });

    it('should format next button message', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 20, limit: 20};
      const productsTotal = 200;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showNextMsg).to.eql('Show <span class="from">31</span> - <span class="to">51</span> of <span class="total">200</span>');
    });

    it('should format next button message and handle "To" limit', () => {
      const getPageInfo = pagination.__get__('getPageInfo');

      const filters = {offset: 0, limit: 20};
      const productsTotal = 23;

      const pageInfo = getPageInfo(filters, productsTotal);

      expect(pageInfo.showNextMsg).to.eql('Show <span class="from">11</span> - <span class="to">23</span> of <span class="total">23</span>');
    });
  });
});
