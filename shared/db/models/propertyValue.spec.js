import Promise from 'bluebird';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import PropertyValue from './propertyValue';

chai.use(sinonChai);

describe('PropertyValue', () => {
  describe('PropertyValue::_set', () => {
    it('should set object', async () => {
      const pv = new PropertyValue('table', {common: 'type'});
      const db = { none: sinon.spy(() => Promise.resolve()) };
      const properties = [ {name: 'prop2', value: 'prop2value'}, {name: 'prop3', value: 'prop3value'}];
      await pv._set(1, {common: 'commonValue', prop1: 'prop1'}, properties, db);

      expect(db.none).to.be.calledOnce;

      expect(db.none.firstCall.args[0]).to.be.deep.equal('INSERT INTO table (id, common, property_name, property_value) VALUES ($1::bigint, $2::type, $3::text, $4::text), ($5::bigint, $6::type, $7::text, $8::text)');
      expect(db.none.firstCall.args[1]).to.be.deep.equal([1, 'commonValue', 'prop2', 'prop2value', 1, 'commonValue', 'prop3', 'prop3value']);
    });

    it('should set object with timestamp', async () => {
      const pv = new PropertyValue('table', {common: 'timestamp'});
      const db = { none: sinon.spy(() => Promise.resolve()) };
      const properties = [ {name: 'prop2', value: 'prop2value'}, {name: 'prop3', value: 'prop3value'}];
      await pv._set(1, {common: 0}, properties, db);

      expect(db.none).to.be.calledOnce;

      expect(db.none.firstCall.args[0]).to.be.deep.equal('INSERT INTO table (id, common, property_name, property_value) VALUES ($1::bigint, to_timestamp($2::bigint / 1000.0), $3::text, $4::text), ($5::bigint, to_timestamp($6::bigint / 1000.0), $7::text, $8::text)');
      expect(db.none.firstCall.args[1]).to.be.deep.equal([1, 0, 'prop2', 'prop2value', 1, 0, 'prop3', 'prop3value']);
    });
  });
});
