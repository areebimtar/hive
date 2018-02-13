import Promise from 'bluebird';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { ProductVariations } from './productVariations';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('ProductVariations', () => {
  let db;
  let dao;
  beforeEach(() => {
    db = {
      none: sinon.stub(),
      one: sinon.stub(),
      many: sinon.stub(),
      any: sinon.stub()
    };
    dao = new ProductVariations(db);
  });

  afterEach(() => {
    // do nothing
  });

  it('should fail without arguments', () => {
    return expect(dao.addSingleVariation()).to.be.rejectedWith(TypeError, 'Bad variation object: undefined');
  });

  it('should fail if recipientId is not number', () => {
    const variation = { propertyId: 2, first: true, formattedName: 'formattedName', scalingOptionId: 100};
    variation.recipientId = 'teens';
    return expect(dao.addSingleVariation(10, variation)).to.be.rejectedWith(TypeError, 'Bad recipientId value: teens');
  });

  it('should insert record to DB (without optional fields)', () => {
    // db will return '1' when passed SQL command
    const getReturn = sinon.stub();
    db.one.returns({ get: getReturn});
    getReturn.returns(Promise.resolve('1'));

    const variation = { propertyId: 2, first: true, formattedName: 'formattedName'};
    const expectedSQL = 'INSERT INTO variations (product_id, property_id, first, formatted_name, scaling_option_id, recipient_id, influences_price, influences_quantity, influences_sku) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';
    const expectedParams = [ 10, 2, true, 'formattedName', undefined, undefined, false, false, false];

    return dao.addSingleVariation(10, variation)
    .then( id => {
      expect(id).to.be.equal('1');
      expect(db.one).to.have.been.calledWith(expectedSQL, expectedParams);
    });
  });

  it('should insert record to DB (with optional fields)', () => {
    // db will return '1' when passed SQL command
    const getReturn = sinon.stub();
    db.one.returns({ get: getReturn});
    getReturn.returns(Promise.resolve('1'));

    const variation = { propertyId: 2, first: true, formattedName: 'formattedName', recipientId: 3, scalingOptionId: 100};
    const expectedSQL = 'INSERT INTO variations (product_id, property_id, first, formatted_name, scaling_option_id, recipient_id, influences_price, influences_quantity, influences_sku) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';
    const expectedParams = [ 10, 2, true, 'formattedName', 100, 3, false, false, false];

    return dao.addSingleVariation(10, variation)
      .then( id => {
        expect(id).to.be.equal('1');
        expect(db.one).to.have.been.calledWith(expectedSQL, expectedParams);
      });
  });

  it('should fail to delete record', () => {
    return expect(dao.deleteByProductId()).to.be.rejectedWith(TypeError, 'Bad input value: undefined');
  });

  it('should delete records from DB', () => {
    db.none.withArgs('DELETE FROM variations WHERE (product_id=$1::bigint)', [1]).returns('good');
    return expect(dao.deleteByProductId(1)).to.be.eventually.equal('good');
  });

  it('should fail to get variations by product id', () => {
    return expect(dao.getByProductId()).to.be.rejected;
  });

  it('should get variations by id', () => {
    db.many.returns(Promise.resolve([]));

    return dao.getByProductId(1)
    .then(variation => {
      expect(db.any).to.have.been.calledWith('SELECT * FROM variations WHERE (product_id=$1::bigint)', [1]);
      expect(variation).to.be.empty;
    });
  });

  it('should retrieve variations with their options', async ()=> {
    db.any.returns(Promise.resolve([
      {
        variation_id: '23',
        variation_product_id: '11',
        variation_first: true,
        variation_property_id: '513',
        variation_formatted_name: 'Number on card',
        option_id: '72',
        option_value_id: '3185894361',
        option_value: 'Number One',
        option_formatted_value: 'Number One [US$42.37]',
        option_price: '1000.00',
        option_is_available: true
      }, {
        variation_id: '23',
        variation_product_id: '11',
        variation_first: true,
        variation_property_id: '513',
        variation_formatted_name: 'Number on card',
        option_id: '73',
        option_value_id: '3185894367',
        option_value: 'Number Two',
        option_formatted_value: 'Number Two [US$46.61]',
        option_price: '1100.00',
        option_is_available: true
      }, {
        variation_id: '23',
        variation_product_id: '11',
        variation_first: true,
        variation_property_id: '513',
        variation_formatted_name: 'Number on card',
        option_id: '77',
        option_value_id: '48516834672',
        option_value: 'Number nine hundred',
        option_formatted_value: 'Number nine hundred [US$84.74]',
        option_price: '2000.00',
        option_is_available: true
      },  {
        variation_id: '24',
        variation_product_id: '13',
        variation_first: true,
        variation_property_id: '100',
        variation_formatted_name: 'Size',
        option_id: '87',
        option_value_id: '1502041613',
        option_value: '5XL',
        option_formatted_value: '5XL [US$84.74]',
        option_price: '2000.00',
        option_is_available: true
      },  {
        variation_id: '24',
        variation_product_id: '13',
        variation_first: true,
        variation_property_id: '100',
        variation_formatted_name: 'Size',
        option_id: '88',
        option_value_id: '1502041614',
        option_value: '6XL',
        option_formatted_value: '6XL [US$84.74]',
        option_price: '2000.00',
        option_is_available: true
      }
    ]));
    const ids = [11, 22, 33];
    const expectedResult = {
      11: {
        23: {
          id: '23',
          productId: '11',
          first: true,
          propertyId: '513',
          formattedName: 'Number on card',
          options: [{
            id: '72',
            valueId: '3185894361',
            value: 'Number One',
            formattedValue: 'Number One [US$42.37]',
            price: '1000.00',
            isAvailable: true
          }, {
            id: '73',
            valueId: '3185894367',
            value: 'Number Two',
            formattedValue: 'Number Two [US$46.61]',
            price: '1100.00',
            isAvailable: true
          }, {
            id: '77',
            valueId: '48516834672',
            value: 'Number nine hundred',
            formattedValue: 'Number nine hundred [US$84.74]',
            price: '2000.00',
            isAvailable: true
          }]
        }
      },
      13: {
        24: {
          id: '24',
          productId: '13',
          first: true,
          propertyId: '100',
          formattedName: 'Size',
          options: [{
            id: '87',
            valueId: '1502041613',
            value: '5XL',
            formattedValue: '5XL [US$84.74]',
            isAvailable: true
          }, {
            id: '88',
            valueId: '1502041614',
            value: '6XL',
            formattedValue: '6XL [US$84.74]',
            isAvailable: true
          }]
        }
      }
    };
    const expectedQuery = 'SELECT variations.id AS variation_id, variations.product_id AS variation_product_id, variations.first AS variation_first, variations.property_id AS variation_property_id, variations.formatted_name AS variation_formatted_name, variations.scaling_option_id AS variation_scaling_option_id, variations.influences_price AS variation_influences_price, variations.influences_quantity AS variation_influences_quantity, variations.influences_sku AS variation_influences_sku, variation_options.id AS option_id, variation_options.value_id AS option_value_id, variation_options.value AS option_value, variation_options.formatted_value AS option_formatted_value, variation_options.price AS option_price, variation_options.is_available AS option_is_available FROM variations INNER JOIN variation_options ON (variations.id = variation_options.variation_id) WHERE (variations.product_id in ($1, $2, $3)) ORDER BY variation_options.sequence ASC, variation_options.id ASC';

    const result = await dao.getByProductIdsWithOptions(ids, db);

    expect(db.any).to.have.been.calledWith(expectedQuery);
    expect(result).to.deep.equal(expectedResult);
  });

  it('should get variations with options by product id', () => {
    db.any.withArgs('SELECT * FROM variations WHERE (product_id=$1::bigint)', [16]).returns(Promise.resolve([
      {id: 12, product_id: 16, first: true, property_id: 100, formatted_name: 'Size'},
      {id: 13, product_id: 16, first: false, property_id: 504, formatted_name: 'Diameter'}]));

    const optionQuery = 'SELECT * FROM variation_options WHERE (variation_id=$1::bigint)';
    db.many.withArgs(optionQuery, [12]).returns(Promise.resolve([]));
    db.many.withArgs(optionQuery, [13]).returns(Promise.resolve([
      {id: 70, variation_id: 13, value_id: 5428984829, value: 'B', formatted_value: 'B cm', price: '42', is_available: true}
    ]));

    return dao.getWithOptionsByProductId(16).then(variations => {
      expect(variations).to.have.length(2);
      expect(variations[1].options).to.be.deep.equal([{id: 70, variation_id: 13, value_id: 5428984829,
        value: 'B', formatted_value: 'B cm', is_available: true }]); // price correctly stripped out despite presence in db
    });
  });
});
