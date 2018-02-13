import _ from 'lodash';
import S from 'string';
import buildMessage from './buildMessage';


const toActionName = (constant) => {
  const words = constant.toLowerCase().split('_');
  const first = words.shift();
  return first + _.map(words, word => _.capitalize(word)).join('');
};

export class Constants {
  constructor(ns = '') {
    // namespace and parent are not enumerable
    Object.defineProperty(this, 'namespace', { value: ns });
    Object.defineProperty(this, 'parent', { value: null, writable: true });
  }

  setParent(parent) {
    this.parent = parent;
  }

  getNameSpace() {
    const nsArr = [];
    if (this.parent && !!this.parent.getNameSpace()) { nsArr.push(this.parent.getNameSpace()); }
    if (!!this.namespace) { nsArr.push(this.namespace); }
    return nsArr.join('.');
  }

  withNameSpace(action) {
    return `${this.getNameSpace()}.${action}`;
  }

  addAsync(action) {
    this.add(action);
    this.add(`${action}_started`);
    this.add(`${action}_succeeded`);
    this.add(`${action}_failed`);
    return this;
  }

  add(action) {
    if (_.isString(action)) {
      const actionKey = S(action).underscore().s.toUpperCase();
      Object.defineProperty(this, actionKey, { get: () => this.withNameSpace(action), enumerable: true });
    } else {
      const ns = S(action.namespace).underscore().s.toUpperCase();
      action.setParent(this);
      this[ns] = action;
    }
    return this;
  }

  actionCreators() {
    const creators = {};
    _(this)
      .keys()
      // .filter(key => consts.test(key))
      .forEach(key => {
        creators[toActionName(key)] = (payload) => buildMessage(this[key], payload);
        return;
      })
      .value();
    return creators;
  }
}
