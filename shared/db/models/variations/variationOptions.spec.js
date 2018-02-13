import Promise from 'bluebird';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { VariationOptions } from './variationOptions';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('variationOptions', () => {
  let db;
  let dao;
  let validOptionFromEtsy;
  let validOption2FromEtsy;
  let validOptionFromVela;
  let validOption2FromVela;

  beforeEach(() => {
    db = {
      none: sinon.stub(),
      one: sinon.stub(),
      many: sinon.stub(),
      any: sinon.stub().returns(Promise.resolve([{id: 1}]))
    };
    dao = new VariationOptions(db);
    validOptionFromEtsy = {
      valueId: 2,
      value: 'value',
      formattedValue: 'formattedValue',
      price: 1.0,
      isAvailable: true
    };
    validOption2FromEtsy = {
      valueId: 3,
      value: 'value2',
      formattedValue: 'formattedValue2',
      price: 2.0,
      isAvailable: true
    };
    validOptionFromVela = {
      value: 'value',
      price: 1.0,
      isAvailable: true
    };
    validOption2FromVela = {
      value: 'value2',
      price: 2.0,
      isAvailable: true
    };
  });

  afterEach(() => {
    // do nothing
  });

  it('should fail to insert options without arguments', () => {
    return expect(dao.addOptions()).to.be.rejectedWith(TypeError, 'Bad variation ID:');
  });

  it('should fail to insert options without options argument', () => {
    return expect(dao.addOptions(1)).to.be.rejectedWith(TypeError, 'Bad input value:');
  });

  it('should fail to insert options when option is passed instead of array of options', () => {
    return expect(dao.addOptions(1, null, validOptionFromEtsy)).to.be.rejectedWith(TypeError, 'Bad input value:');
  });

  it('should insert option from Etsy into to DB', () => {
    db.none.returns(Promise.resolve());

    const expectedSQL = 'INSERT INTO variation_options (value, is_available, sequence, value_id, variation_id, price, formatted_value) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, value_id, value';
    const expectedParams = ['value', true, 1, 2, 1, null, 'formattedValue'];

    return dao.addOptions(1, false, [validOptionFromEtsy])
    .then(() => {
      expect(db.any).to.have.been.calledWith(expectedSQL, expectedParams);
    });
  });

  it('should insert options with prices from Etsy into to DB', () => {
    db.none.returns(Promise.resolve());

    const expectedSQL = 'INSERT INTO variation_options (value, is_available, sequence, value_id, variation_id, price, formatted_value) VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14) RETURNING id, value_id, value';
    const expectedParams = ['value', true, 1, 2, 1, 1.0, 'formattedValue', 'value2', true, 2, 3, 1, 2.0, 'formattedValue2'];

    return dao.addOptions(1, false, [validOptionFromEtsy, validOption2FromEtsy])
      .then(() => {
        expect(db.any).to.have.been.calledWith(expectedSQL, expectedParams);
      });
  });

  it('should insert option from Vela client into to DB', () => {
    db.none.returns(Promise.resolve());

    const expectedSQL = 'INSERT INTO variation_options (value, is_available, sequence, value_id, variation_id, price, formatted_value) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, value_id, value';
    const expectedParams = ['value', true, 1, null, 1, null, null];

    return dao.addOptions(1, true, [validOptionFromVela])
      .then(() => {
        expect(db.any).to.have.been.calledWith(expectedSQL, expectedParams);
      });
  });

  it('should insert options with prices from Vela client into to DB', () => {
    db.none.returns(Promise.resolve());

    const expectedSQL = 'INSERT INTO variation_options (value, is_available, sequence, value_id, variation_id, price, formatted_value) VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14) RETURNING id, value_id, value';
    const expectedParams = ['value', true, 1, null, 1, 1.0, null, 'value2', true, 2, null, 1, 2.0, null];

    return dao.addOptions(1, false, [validOptionFromVela, validOption2FromVela])
      .then(() => {
        expect(db.any).to.have.been.calledWith(expectedSQL, expectedParams);
      });
  });

  it('should fail to delete record', () => {
    return expect(dao.deleteByVariationId()).to.be.rejectedWith(TypeError, 'Bad input value: undefined');
  });

  it('should delete records from DB', () => {
    db.none.withArgs('DELETE FROM variation_options WHERE (variation_id=$1::bigint)', [1]).returns('good');
    return expect(dao.deleteByVariationId(1)).to.be.eventually.equal('good');
  });

  it('should fail to get options by variation id', () => {
    return expect(dao.getByVariationId()).to.be.rejectedWith(TypeError);
  });

  it('should get options by variation id', () => {
    db.many.returns(Promise.resolve([]));

    return dao.getByVariationId(1)
    .then(variation => {
      expect(db.many).to.have.been.calledWith('SELECT * FROM variation_options WHERE (variation_id=$1::bigint)', [1]);
      expect(variation).to.be.empty;
    });
  });

  describe('Extraneous price stripping', () => {
    const differentPrices = () => [{ id: 9, price: '10' }, { id: 10, price: 11 }];
    const differentPricesStripped = () => [{ id: 9 }, { id: 10 }];
    const samePrices = () => [{ id: 1, price: '10' }, { id: 2, price: 10 }, { id: 3, price: 10.0 }];
    const samePricesStripped = () => [{ id: 1 }, { id: 2 }, { id: 3 }];


    it('Will respect different pricing when it exists', () => {
      const prices = differentPrices();
      VariationOptions.removeExtraneousPrices(prices);
      expect(prices).to.eql(differentPrices());
    });

    it('Will strip prices when they are the same and force is not used', () => {
      const prices = samePrices();
      VariationOptions.removeExtraneousPrices(prices);
      expect(prices).to.eql(samePricesStripped());
    });

    it('Will strip prices when they are different if force is used', () => {
      const prices = differentPrices();
      VariationOptions.removeExtraneousPrices(prices, true);
      expect(prices).to.eql(differentPricesStripped());
    });
  });
});
