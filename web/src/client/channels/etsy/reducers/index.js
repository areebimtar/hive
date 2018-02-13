import _ from 'lodash';
import * as shops from './shops';
import * as bulk from './bulk';
import Reducers, { Reducer } from 'app/client/Reducer';

const reducers = {
  shops,
  bulk
};

Reducers.add(_.reduce(reducers, (reducer, impl) => impl.addReducers(reducer), new Reducer('Etsy')));

export default reducers;
