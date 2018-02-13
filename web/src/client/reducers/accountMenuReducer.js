// import { fromJS } from 'immutable';
import Reducers, { Reducer } from '../Reducer';
// import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
// import * as utils from '../utils';

function* hide(reduction) {
  return reduction.setIn(['accountMenu', 'visible'], false);
}

function* show(reduction) {
  return reduction.setIn(['accountMenu', 'visible'], true);
}

function* toggle(reduction) {
  return reduction.updateIn(['accountMenu', 'visible'], visible => !visible);
}

Reducers.add(new Reducer('AccountMenu')
  .add(CONSTANTS.ACCOUNTMENU.SHOW, show)
  .add(CONSTANTS.ACCOUNTMENU.HIDE, hide)
  .add(CONSTANTS.ACCOUNTMENU.TOGGLE, toggle));
