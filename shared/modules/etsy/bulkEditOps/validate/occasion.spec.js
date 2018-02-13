import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import module, { validate } from './occasion';

chai.use(sinonChai);

describe('Occasion - validate', () => {
  describe('validate', ()=> {
    let getAttribute;

    beforeEach(() => {
      getAttribute = sinon.stub();
      module.__Rewire__('getAttribute', getAttribute);
    });

    afterEach(() => {
      module.__ResetDependency__('getAttribute');
    });

    it('should not set error can_write_inventory is set to false', () => {
      const availableOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
      getAttribute.returns(fromJS({ availableOptions }));
      expect(validate(fromJS({ can_write_inventory: false }))).to.be.null;
      expect(validate(fromJS({ can_write_inventory: false, attributes: [] }))).to.be.null;
    });

    it('should not set error if there are no attributes', () => {
      const availableOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
      getAttribute.returns(fromJS({ availableOptions }));
      expect(validate(fromJS({ can_write_inventory: true }))).to.be.null;
      expect(validate(fromJS({ can_write_inventory: true, attributes: [] }))).to.be.null;
    });

    it('should not set error if there is no occasion attribute', () => {
      const availableOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
      getAttribute.returns(fromJS({ availableOptions }));
      const attributes = [{ propertyId: '123', valueIds: ['12']}];
      const product = fromJS({ can_write_inventory: true, attributes });
      const error = validate(product);

      expect(error).to.be.null;
    });

    it('should not set error if there is valid occasion attribute', () => {
      const availableOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
      getAttribute.returns(fromJS({ availableOptions }));
      const attributes = [{ propertyId: '46803063641', valueIds: ['1']}];
      const product = fromJS({ can_write_inventory: true, attributes });
      const error = validate(product);

      expect(getAttribute).to.have.been.called;
      expect(error).to.be.null;
    });

    it('should set error if taxonomy supports occasions but not the one specified', () => {
      const availableOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
      getAttribute.returns(fromJS({ availableOptions }));
      const attributes = [{ propertyId: '46803063641', valueIds: ['4']}];
      const product = fromJS({ can_write_inventory: true, attributes });
      const error = validate(product);

      expect(getAttribute).to.have.been.called;
      expect(error).to.eql(`Occasion cannot be changed due to category`);
    });

    it('should set a different error if taxonomy supports no occasions', () => {
      const availableOptions = [];
      getAttribute.returns(fromJS({ availableOptions }));
      const attributes = [{ propertyId: '46803063641', valueIds: ['4']}];
      const product = fromJS({ can_write_inventory: true, attributes });
      const error = validate(product);

      expect(getAttribute).to.have.been.called;
      expect(error).to.eql('The category of this listing does not support occasion');
    });
  });
});
