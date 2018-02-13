import _ from 'lodash';


export class Reducer {
  constructor(ns = '') {
    this.namespace = ns;
  }

  add(action, reducer) {
    if (_.isString(action)) {
      const actionKey = action.split('.').pop().toUpperCase();
      this[actionKey] = reducer;
    } else if (action instanceof Reducer) {
      const ns = action.namespace.toUpperCase();
      this[ns] = action;
    }
    return this;
  }
}

export default new Reducer();
