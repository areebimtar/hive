import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import createMissingSections from './createMissingSections';
import { BULK_EDIT_OP_CONSTS } from '../../../../shared/modules/etsy/bulkOpsConstants';
import { FIELDS } from '../../../../shared/modules/etsy/constants';

chai.use(sinonChai);

import Promise from 'bluebird';

const SHOP_ID = 36;

describe('Missing sections', () => {
  let models;
  let connectionMock;

  const sectionsMap = {
    286: { id: 286, shop_id: SHOP_ID, [FIELDS.SECTION_ID]: 21218447, value: 'XXX'}
  };

  beforeEach( () => {
    connectionMock = {
      none: sinon.stub(),
      one: sinon.stub(),
      many: sinon.stub(),
      any: sinon.stub()
    };
    models = {
      sections: {
        getSections: sinon.spy(() => Promise.resolve(sectionsMap)),
        insert: sinon.spy(() => Promise.resolve({ newValue: 287 }))
      }
    };
  });

  it('should add a missing section to db and replace in ops', async () => {
    const ops = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 'newValue'
    }];
    const expectedOps = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 287
    }];
    const opsOut = await createMissingSections(models, SHOP_ID, ops, connectionMock);
    expect(models.sections.insert).to.have.been.called;
    expect(opsOut).to.be.deep.equal(expectedOps);
  });

  it('should not add section present in db', async () => {
    const ops = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 286
    }];
    const expectedOps = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 286
    }];
    const opsOut = await createMissingSections(models, SHOP_ID, ops, connectionMock);
    expect(models.sections.insert).to.have.not.been.called;
    expect(opsOut).to.be.deep.equal(expectedOps);
  });

  it('should not add section when its name is already present in db', async () => {
    const ops = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 'XXX'
    }];
    const expectedOps = [{
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: 286
    }];
    const opsOut = await createMissingSections(models, SHOP_ID, ops, connectionMock);
    expect(models.sections.insert).to.have.not.been.called;
    expect(opsOut).to.be.deep.equal(expectedOps);
  });
});
