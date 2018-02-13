import {expect} from 'chai';
import _ from 'lodash';

import {check} from './check';

describe('check', () => {
  it('should do nothing if condition is truthy', () => {
    expect(check(true, '')).to.be.undefined;
    expect(check([], '')).to.be.undefined;
  });

  it('should throw exception if format is not provided', () => {
    expect(() => check(true)).to.throw(TypeError);
    expect(() => check(true)).to.throw(/Missing mandatory argument message/);
  });

  it('should throw exception with passed message when condition is falsy', () => {
    expect(() => check(false, 'AA')).to.throw('AA');
    expect(() => check('', 'AA')).to.throw('AA');
    expect(() => check(undefined, 'AA')).to.throw('AA');
    expect(() => check(null, 'AA')).to.throw('AA');
  });

  it('should format error message based on parameters', () => {
    expect(() => check(false, 'Hi %s, is %s = %s?', 'AA', [1, 'a'], {a: 5})).to.throw('Hi AA, is [1,"a"] = {"a":5}');
  });

  it('should format undefined as undefined', () => {
    expect(() => check(false, 'Hi %s', undefined)).to.throw('Hi undefined');
  });

  it('should format null as null', () => {
    expect(() => check(false, 'Hi %s', null)).to.throw('Hi null');
  });

  it('should format missing argument as undefined', () => {
    expect(() => check(false, 'Hi %s')).to.throw('Hi undefined');
  });

  it('should format many arguments', () => {
    const data = _.range(1, 10);
    const fmt = data.reduce((a) => a + ' %s', 'Hi');
    expect(() => check(false, fmt, ...data)).to.throw('Hi 1 2 3 4 5 6 7 8 9');
  });
});
