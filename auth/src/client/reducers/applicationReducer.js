import { browserHistory } from 'react-router';
import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../actionsConstants';
import * as utils from '../utils';

function* failHandler(reduction, error) {
  return reduction.update('errors', errors => { errors.push(error); return errors; });
}

function* bootstrapApplication(reduction) {
  yield dispatch => utils
    .APICall({method: 'get', url: '/config' })
    .then((config) => dispatch(Actions.Application.bootstrapSucceeded(config)),
      error => dispatch(Actions.Application.bootstrapFailed(error)));
  return reduction;
}

function* bootstrapSucceeded(reduction, data) {
  return reduction.setIn(['config'], data);
}

function* changeRoute(reduction, route) {
  yield dispatch => dispatch(Actions.Application.changeRouteStarted(route));
  yield (dispatch) => setTimeout(() => {
    browserHistory.push(route);
    dispatch(Actions.Application.changeRouteSucceeded(route));
  }, 1);
  return reduction;
}

function* navigateToUrl(reduction, url) {
  window.location = url;
  return reduction;
}

// register reducers
Reducers.add(new Reducer('Application')
  .add(CONSTANTS.APPLICATION.BOOTSTRAP, bootstrapApplication)
  .add(CONSTANTS.APPLICATION.BOOTSTRAP_SUCCEEDED, bootstrapSucceeded)
  .add(CONSTANTS.APPLICATION.BOOTSTRAP_FAILED, failHandler)
  .add(CONSTANTS.APPLICATION.CHANGE_ROUTE, changeRoute)
  .add(CONSTANTS.APPLICATION.NAVIGATE_TO_URL, navigateToUrl));
