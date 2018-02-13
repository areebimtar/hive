import chai, { assert, expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';
import _ from 'lodash';

import * as bulkEdit from './bulkEdit';

chai.use(sinonChai);

const CHANNEL_ID = 1;

describe('bulkEdit', () => {
  let opHandlers;
  let getHandlersByChannelId;

  beforeEach(() => {
    opHandlers = {
      op1: { validate: sinon.spy() },
      op2: { validate: sinon.spy() }
    };
    getHandlersByChannelId = sinon.stub().returns(opHandlers);
    bulkEdit.__Rewire__('getHandlersByChannelId', getHandlersByChannelId);
  });

  afterEach(() => {
    bulkEdit.__ResetDependency__('getHandlersByChannelId');
  });

  describe('validate', () => {
    it('should call correct validator', () => {
      const product = fromJS({ title: 'test' });
      bulkEdit.validate(CHANNEL_ID, product, 'op1');
      opHandlers.op1.validate.should.have.been.calledWithExactly(product);
      opHandlers.op2.validate.should.not.have.been.called;
    });

    it('should return valid=true on missing type', () => {
      const product = fromJS({ title: 'test' });
      const result = bulkEdit.validate(CHANNEL_ID, product).toJS();
      opHandlers.op1.validate.should.not.have.been.called;
      opHandlers.op2.validate.should.not.have.been.called;
      expect(result).to.eql({valid: true});
    });

    it('should throw on missing product', () => {
      try {
        bulkEdit.validate(CHANNEL_ID, undefined, 'op1');
      } catch (e) {
        opHandlers.op1.validate.should.not.have.been.called;
        opHandlers.op2.validate.should.not.have.been.called;
        return;
      }
      expect(true).to.be.false;
    });
  });

  describe('applyOp', () => {
    beforeEach(() => {
      opHandlers.op1.validate = sinon.spy();
      opHandlers.op2.validate = sinon.spy();
    });

    it('should throw on missing product', () => {
      try {
        bulkEdit.applyOp();
      } catch (e) {
        opHandlers.op1.validate.should.not.have.been.called;
        opHandlers.op2.validate.should.not.have.been.called;
        return;
      }
      expect(true).to.be.false;
    });

    it('should apply op', () => {
      const product = fromJS({ title: 'test' });
      opHandlers.op1.validate = sinon.stub().returns(fromJS({valid: true}));
      opHandlers.op1.apply = sinon.stub().returns(fromJS({ title: 'applied' }));
      const result = bulkEdit.applyOp(CHANNEL_ID, product, fromJS({type: 'op1', value: { some: 'test' } }));

      assert(opHandlers.op1.apply.called);
      assert(opHandlers.op1.validate.called);
      opHandlers.op2.validate.should.not.have.been.called;
      expect(result.toJS()).to.eql({ title: 'applied' });
    });

    it('should not apply op', () => {
      const product = fromJS({ title: 'test' });
      opHandlers.op1.validate = sinon.stub().returns(fromJS({valid: false}));
      opHandlers.op1.apply = sinon.stub().returns(fromJS({ title: 'failed' }));
      const result = bulkEdit.applyOp(CHANNEL_ID, product, fromJS({type: 'op1', value: { some: 'test' } }));

      assert(opHandlers.op1.apply.called);
      assert(opHandlers.op1.validate.called);
      opHandlers.op2.validate.should.not.have.been.called;
      expect(result.toJS()).to.eql(product.toJS());
    });

    it('should not apply op if value is empty', () => {
      const product = fromJS({ title: 'test' });
      opHandlers.op1.validate = sinon.stub().returns(fromJS({valid: false}));
      opHandlers.op1.apply = sinon.stub().returns(fromJS({ title: 'failed' }));

      const values = [undefined, null, '', {}, []];
      _.each(values, value => {
        const result = bulkEdit.applyOp(CHANNEL_ID, product, fromJS({type: 'op1', value}));

        assert(opHandlers.op1.validate.called);
        opHandlers.op2.validate.should.not.have.been.called;
        expect(result.toJS()).to.eql(product.toJS());
      });
    });
  });
});
