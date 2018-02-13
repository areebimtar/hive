import {expect} from 'chai';
import _ from 'lodash';
import * as realAPI from './api';


describe('API call', () => {
  const api = { processParams: realAPI.__get__('processParams')};

  describe('processParams', () => {
    it('should handle bad or empty input', () => {
      const inputs = [undefined, null, '', {}, 0, 21, 'qwqw'];
      _.each(inputs, input => expect(api.processParams(input)).to.eql({}));
    });

    it('should empty strings', () => {
      const input = { test: '' };
      const res = api.processParams(input);
      expect(res).to.eql({});
    });

    it('should handle valid strings', () => {
      const input = { test: 'some_input' };
      const res = api.processParams(input);
      expect(res).to.eql(input);
    });

    it('should remove multiple spaces from strings', () => {
      const input = { test: 'some     \t\n       input' };
      const res = api.processParams(input);
      expect(res).to.eql({test: 'some input'});
    });

    it('should trim strings', () => {
      const input = { test: '\t  some input  \n' };
      const res = api.processParams(input);
      expect(res).to.eql({test: 'some input'});
    });

    it('should "flatten" bad object', () => {
      const input = { test: null };
      const res = api.processParams(input);
      expect(res).to.eql({});
    });

    it('should "flatten" emtpy object', () => {
      const input = { test: {} };
      const res = api.processParams(input);
      expect(res).to.eql({});
    });

    it('should "flatten" object', () => {
      const input = { tags: { a: true, b: false, c: true } };
      const res = api.processParams(input);
      expect(res).to.eql({tags: 'a,c'});
    });

    it('should empty array', () => {
      const input = { test: [] };
      const res = api.processParams(input);
      expect(res).to.eql({});
    });

    it('should array', () => {
      const input = { test: [1, '2', 3, '4'] };
      const res = api.processParams(input);
      expect(res).to.eql({test: '1,2,3,4'});
    });

    it('should handle number', () => {
      const input = { test: 2 };
      const res = api.processParams(input);
      expect(res).to.eql({test: 2});
    });

    it('should handle number 0', () => {
      const input = { test: 0 };
      const res = api.processParams(input);
      expect(res).to.eql({test: 0});
    });

    it('should handle boolean (true)', () => {
      const input = { test: true };
      const res = api.processParams(input);
      expect(res).to.eql({test: true});
    });

    it('should handle boolean (false)', () => {
      const input = { test: false };
      const res = api.processParams(input);
      expect(res).to.eql({test: false});
    });
  });
});
