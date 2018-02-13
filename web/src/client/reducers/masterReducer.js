import { fromJS } from 'immutable';
import * as Reducers from './reducers'; // eslint-disable-line no-unused-vars
import Reducer from '../Reducer';
import * as thirdPartyReducers from './thirdPartyReducers';


export default function* (reduction, action) {
  const { type, payload } = action;
  const path = type.toUpperCase().split('.');

  // reducers are nested by their "namespaces"
  // split type by "." (dot) and get last reducer (function)
  let reducer = Reducer;
  do {
    // get next namespace
    const key = path.shift();
    // is there a nested reducer/namespace
    // if not, there is nothing to do
    if (!reducer[key]) { break; }
    // continue with remaining path
    reducer = reducer[key];
  } while (path.length);

  // we reached the end, is it reducing function?
  if (typeof reducer === 'function') {
    // reduce action
    return yield* reducer(reduction, payload);
  } else {
    let updatedReduction = reduction;
    // nope, lets try form reducer
    for (const key in thirdPartyReducers) {
      if (thirdPartyReducers.hasOwnProperty(key)) {
        // stores for each reducer is nested in 'combined' map
        const combinedPath = ['combined', key];
        // get state
        const stateImm = reduction.getIn(combinedPath);
        const state = (stateImm && stateImm.toJS) ? stateImm.toJS() : {};
        // call reducer and set new state
        updatedReduction = updatedReduction.setIn(combinedPath, fromJS(thirdPartyReducers[key](state, action)));
      }
    }
    return updatedReduction;
  }
}
