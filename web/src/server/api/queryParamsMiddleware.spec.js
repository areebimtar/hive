import qpm from './queryParamsMiddleware';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

describe('queryParamsMiddleware', () => {
  function runThroughMiddleware(obj) {
    const next = sinon.spy();
    qpm({query: obj}, null, next);
    expect(next).to.have.been.calledOnce;
    return obj;
  }

  it('parsesNumbersCorrectly', () => {
    const result = runThroughMiddleware({
      a: 'hello',
      b: '12',
      c: 'hello12',
      d: '12hello'
    });
    expect(result.a).to.equal('hello');
    expect(result.b).to.equal(12);
    expect(result.c).to.equal('hello12');
    expect(result.d).to.equal('12hello');
  });

  it('converts strings with commas to arrays', () => {
    const result = runThroughMiddleware({ foo: 'hello,goodbye,whatever' });
    expect(result.foo).to.have.all.members(['hello', 'goodbye', 'whatever']);
  });

  it('converts strings inside arrays to numbers as appropriate', () => {
    const result = runThroughMiddleware({ foo: 'hello,12,goodbye,6mm'});
    expect(result.foo).to.have.all.members(['hello', 12, 'goodbye', '6mm']);
  });
});
