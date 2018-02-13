import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';

import * as shopsProductsTable from './shopsProductsTable';

chai.use(sinonChai);

describe('shopsProductsTable', () => {
  let formatDate;

  beforeEach(() => {
    formatDate = shopsProductsTable.__get__('formatDate');
  });

  it('should handle null', () => {
    expect(formatDate(null)).to.eql('');
  });
});
