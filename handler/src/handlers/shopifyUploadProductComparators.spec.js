import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import shopifyUploadProductComparators from './shopifyUploadProductComparators';

chai.use(sinonChai);

describe('shopifyUploadProductComparators', () => {
  describe('tagsComparator', () => {
    let tagsComparator;

    beforeEach(() => {
      tagsComparator = shopifyUploadProductComparators.__get__('tagsComparator');
    });

    it('should return false if number of tags is different', () => {
      const result = tagsComparator(['a', 'b', 'c'], ['a', 'b']);
      expect(result).to.be.false;
    });

    it('should return false if tags are different', () => {
      const result = tagsComparator(['a', 'b', 'c'], ['aa', 'bb', 'cc']);
      expect(result).to.be.false;
    });

    it('should return true if tags are same and in same order', () => {
      const result = tagsComparator(['a', 'b', 'c'], ['a', 'b', 'c']);
      expect(result).to.be.true;
    });

    it('should return true if tags are same but in different order', () => {
      const result = tagsComparator(['b', 'c', 'a'], ['a', 'b', 'c']);
      expect(result).to.be.true;
    });
  });

  describe('htmlComparator', () => {
    let htmlComparator;

    beforeEach(() => {
      htmlComparator = shopifyUploadProductComparators.__get__('htmlComparator');
    });

    it('should return false if inner texts are different', () => {
      const result = htmlComparator('<p>test</p>', '<p>teest</p>');
      expect(result).to.be.false;
    });

    it('should return true if htmls are same', () => {
      const result = htmlComparator('<p>test</p>', '<p>test</p>');
      expect(result).to.be.true;
    });

    it('should return true if inner texts are same', () => {
      const result = htmlComparator('<p></br></p><p>test</p>', '<p>test</p>');
      expect(result).to.be.true;
    });
  });

  describe('photosComparator', () => {
    let photosComparator;

    beforeEach(() => {
      photosComparator = shopifyUploadProductComparators.__get__('photosComparator');
    });

    it('should return false if number of photos is different', () => {
      const result = photosComparator([{}, {}], [{}, {}, {}]);
      expect(result).to.be.false;
    });

    it('should return true if number of photos is same', () => {
      const result = photosComparator([{}, {}], [{}, {}]);
      expect(result).to.be.true;
    });
  });

  describe('defaultComparator', () => {
    let defaultComparator;

    beforeEach(() => {
      defaultComparator = shopifyUploadProductComparators.__get__('defaultComparator');
    });

    it('should return false if values are different', () => {
      expect(defaultComparator({a: 1}, {b: 2})).to.be.false;
      expect(defaultComparator('test', 'qwerty')).to.be.false;
      expect(defaultComparator(null, undefined)).to.be.false;
      expect(defaultComparator(['qwe'], ['wer'])).to.be.false;
    });

    it('should return true if values are same', () => {
      expect(defaultComparator({a: 1, b: 2}, {a: 1, b: 2})).to.be.true;
      expect(defaultComparator('test', 'test')).to.be.true;
      expect(defaultComparator(null, null)).to.be.true;
      expect(defaultComparator(['qwe', 'wer'], ['qwe', 'wer'])).to.be.true;
    });
  });

  describe('isResponseValid', () => {
    let isResponseValid;
    let comparators;

    beforeEach(() => {
      comparators = {
        tags: sinon.stub(),
        body_html: sinon.stub(),
        photos: sinon.stub(),
        default: sinon.stub()
      };
      shopifyUploadProductComparators.__Rewire__('comparators', comparators);
      isResponseValid = shopifyUploadProductComparators.__get__('isResponseValid');
    });

    afterEach(() => {
      shopifyUploadProductComparators.__ResetDependency__('comparators');
    });

    it('should use tags comparator', () => {
      const request = { tags: ['a', 'b'] };
      const response = { tags: ['b', 'c'] };

      isResponseValid(request, response);

      expect(comparators.tags).to.have.been.calledOnce;
      expect(comparators.tags).to.have.been.calledWithExactly(['a', 'b'], ['b', 'c']);
    });

    it('should use html comparator', () => {
      const request = { body_html: '<p>qwe</p>' };
      const response = { body_html: '<p>wer</p>' };

      isResponseValid(request, response);

      expect(comparators.body_html).to.have.been.calledOnce;
      expect(comparators.body_html).to.have.been.calledWithExactly('<p>qwe</p>', '<p>wer</p>');
    });

    it('should use photos comparator', () => {
      const request = { photos: [{}, {}] };
      const response = { photos: [{}] };

      isResponseValid(request, response);

      expect(comparators.photos).to.have.been.calledOnce;
      expect(comparators.photos).to.have.been.calledWithExactly([{}, {}], [{}]);
    });

    it('should use default comparator', () => {
      const request = { title: 'test' };
      const response = { title: 'qwe' };

      isResponseValid(request, response);

      expect(comparators.default).to.have.been.calledOnce;
      expect(comparators.default).to.have.been.calledWithExactly('test', 'qwe');
    });
  });
});
