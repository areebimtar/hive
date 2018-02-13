import { expect } from 'chai';

export function expectResponseWasSent(res) {
  expect(res.json.callCount + res.sendSpy.callCount).to.be.above(0);
}
