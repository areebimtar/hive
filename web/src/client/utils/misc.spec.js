import { expect } from 'chai';
import { fromJS } from 'immutable';

import * as misc from './misc';

describe('misc utilities', () => {
  describe('isEmptyOrFalsy', () => {
    const isEmptyOrFalsy = misc.isEmptyOrFalsy;
    it('Checks primitives for truthy values', () => {
      expect(isEmptyOrFalsy(false)).to.be.true;
      expect(isEmptyOrFalsy(true)).to.be.false;
      expect(isEmptyOrFalsy(0)).to.be.true;
      expect(isEmptyOrFalsy(33)).to.be.false;
      expect(isEmptyOrFalsy('')).to.be.true;
      expect(isEmptyOrFalsy('hi')).to.be.false;
      expect(isEmptyOrFalsy(null)).to.be.true;
      expect(isEmptyOrFalsy(undefined)).to.be.true;
    });

    it('Checks arrays for contents', () => {
      expect(isEmptyOrFalsy([])).to.be.true;
      expect(isEmptyOrFalsy([0])).to.be.false;
    });

    it('Checks immutables for empty contents', () => {
      expect(isEmptyOrFalsy(fromJS({}))).to.be.true;
      expect(isEmptyOrFalsy(fromJS({foo: 1}))).to.be.false;
      expect(isEmptyOrFalsy(fromJS([]))).to.be.true;
      expect(isEmptyOrFalsy(fromJS([1]))).to.be.false;
      expect(isEmptyOrFalsy(fromJS(false))).to.be.true;
      expect(isEmptyOrFalsy(fromJS(true))).to.be.false;
      expect(isEmptyOrFalsy(fromJS(''))).to.be.true;
      expect(isEmptyOrFalsy(fromJS('hi'))).to.be.false;
      expect(isEmptyOrFalsy(fromJS(0))).to.be.true;
      expect(isEmptyOrFalsy(fromJS(5))).to.be.false;
      expect(isEmptyOrFalsy(fromJS(null))).to.be.true;
      expect(isEmptyOrFalsy(fromJS(undefined))).to.be.true;
    });
  });
});
