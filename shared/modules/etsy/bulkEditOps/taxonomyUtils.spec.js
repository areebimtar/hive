import chai, {expect} from 'chai';
import sinon from 'sinon';  // eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import * as taxonomyUtils from './taxonomyUtils';

taxonomyUtils.__Rewire__('TAXONOMY_MAP', {
  1: { name: 'id1', fullPath: ['1'] },
  2: { name: 'id2', fullPath: ['2'] },
  3: { name: 'id3', fullPath: ['1', '3'] },
  4: { name: 'id4', fullPath: ['1', '4'] },
  5: { name: 'id 5', fullPath: ['1', '3', '5'] },
  6: { name: 'id6', fullPath: ['1', '3', '6'] },
  taxonomy: {
    ids: ['1', '2'],
    1: { ids: ['3', '4'], 3: { ids: ['5', '6'] } }
  }
});

describe('BulkEditOps - TaxonomyUtils', () => {
  describe('getIndexes', () => {
    it('should handle empty/bad taxonomy_id', () => {
      expect(taxonomyUtils.getIndexes()).to.eql(['0']);
      expect(taxonomyUtils.getIndexes('')).to.eql(['0']);
      expect(taxonomyUtils.getIndexes('666')).to.eql(['0']);
    });

    it('should get final indexex', () => {
      expect(taxonomyUtils.getIndexes('2')).to.eql(['0']);
      expect(taxonomyUtils.getIndexes('4')).to.eql(['0', '1']);
      expect(taxonomyUtils.getIndexes('5')).to.eql(['0', '1', '2']);
      expect(taxonomyUtils.getIndexes('6')).to.eql(['0', '1', '2']);
    });

    it('should get indexex with additional empty one', () => {
      expect(taxonomyUtils.getIndexes('1')).to.eql(['0', '1']);
      expect(taxonomyUtils.getIndexes('3')).to.eql(['0', '1', '2']);
    });
  });

  describe('getValues', () => {
    it('should return full path', () => {
      expect(taxonomyUtils.getValues('1')).to.eql(['1']);
      expect(taxonomyUtils.getValues('6')).to.eql(['1', '3', '6']);
    });

    it('should handle bad taxonomy id', () => {
      expect(taxonomyUtils.getValues('')).to.eql([undefined]);
      expect(taxonomyUtils.getValues()).to.eql([undefined]);
      expect(taxonomyUtils.getValues('null')).to.eql([undefined]);
      expect(taxonomyUtils.getValues(null)).to.eql([undefined]);
    });
  });

  describe('getOptions', () => {
    it('should return options', () => {
      expect(taxonomyUtils.getOptions('1')).to.eql([ ['1', '2'], ['3', '4'] ]);
      expect(taxonomyUtils.getOptions('6')).to.eql([ ['1', '2'], ['3', '4'], ['5', '6'] ]);
    });

    it('should handle bad taxonomy id', () => {
      expect(taxonomyUtils.getOptions('')).to.eql([ ['1', '2'] ]);
      expect(taxonomyUtils.getOptions()).to.eql([ ['1', '2'] ]);
      expect(taxonomyUtils.getOptions('null')).to.eql([ ['1', '2'] ]);
      expect(taxonomyUtils.getOptions(null)).to.eql([ ['1', '2'] ]);
    });
  });

  describe('getTaxonomyArray', () => {
    it('should return taxonomy array', () => {
      expect(taxonomyUtils.getTaxonomyArray('1')).to.eql([ 'id1' ]);
      expect(taxonomyUtils.getTaxonomyArray('6')).to.eql([ 'id1', 'id3', 'id6' ]);
    });

    it('should handle bad taxonomy id', () => {
      expect(taxonomyUtils.getTaxonomyArray('')).to.eql([ ]);
      expect(taxonomyUtils.getTaxonomyArray()).to.eql([ ]);
      expect(taxonomyUtils.getTaxonomyArray('null')).to.eql([ ]);
      expect(taxonomyUtils.getTaxonomyArray(null)).to.eql([ ]);
    });
  });

  describe('getTaxonomyPath', () => {
    it('should return taxonomy path', () => {
      expect(taxonomyUtils.getTaxonomyPath('1')).to.eql('{id1}');
      expect(taxonomyUtils.getTaxonomyPath('6')).to.eql('{id1,id3,id6}');
      expect(taxonomyUtils.getTaxonomyPath('5')).to.eql('{id1,id3,"id 5"}');
    });

    it('should handle bad taxonomy id', () => {
      expect(taxonomyUtils.getTaxonomyPath('')).to.eql('{}');
      expect(taxonomyUtils.getTaxonomyPath()).to.eql('{}');
      expect(taxonomyUtils.getTaxonomyPath('null')).to.eql('{}');
      expect(taxonomyUtils.getTaxonomyPath(null)).to.eql('{}');
    });
  });

  describe('getTaxonomyName', () => {
    it('should return taxonomy path', () => {
      expect(taxonomyUtils.getTaxonomyName('1')).to.eql('id1');
      expect(taxonomyUtils.getTaxonomyName('6')).to.eql('id6');
      expect(taxonomyUtils.getTaxonomyName('5')).to.eql('id 5');
    });

    it('should handle bad taxonomy id', () => {
      expect(taxonomyUtils.getTaxonomyName('')).to.eql('');
      expect(taxonomyUtils.getTaxonomyName()).to.eql('');
      expect(taxonomyUtils.getTaxonomyName('null')).to.eql('');
      expect(taxonomyUtils.getTaxonomyName(null)).to.eql('');
    });
  });
});
