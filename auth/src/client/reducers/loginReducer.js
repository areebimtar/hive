import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../actionsConstants';
import * as utils from '../utils';

function* inProgress(reduction) {
  return reduction.setIn(['login', 'inProgress'], true);
}

const handleFailedAPIRequest = (reduction, error) => {
  const errorMsg = error.result === 'error' ? error.data : error.toString();
  return reduction
    .update('errors', errors => errors.push(error))
    .setIn(['login', 'inProgress'], false)
    .setIn(['login', 'errorMsg'], errorMsg);
};

function* failed(reduction, error) {
  return handleFailedAPIRequest(reduction, error);
}

function* submit(reduction, loginInfo) {
  yield dispatch => dispatch(Actions.Login.submitStarted());

  yield dispatch => utils.APICall({method: 'post', url: '/login', payload: loginInfo}).then(
    (response) => dispatch(Actions.Login.submitSucceeded(response)),
    (error) => dispatch(Actions.Login.submitFailed(error)));

  return reduction;
}

function* submitSucceeded(reduction, response) {
  const data = response && response.data;
  if (response.result === 'success' && data) {
    // all is good, "redirect" to Application Server
    yield dispatch => dispatch(Actions.Application.navigateToUrl(data));
    return reduction;
  }
  return handleFailedAPIRequest(reduction, data);
}

function* createAccount(reduction, createAccountInfo) {
  yield dispatch => dispatch(Actions.Login.createAccountStarted());

  yield dispatch => utils.APICall({method: 'post', url: '/createAccount', payload: createAccountInfo}).then(
    response => dispatch(Actions.Login.createAccountSucceeded(response)),
    error => dispatch(Actions.Login.createAccountFailed(error)));

  return reduction;
}

function* createAccountSucceeded(reduction, response) {
  const data = response && response.data;
  if (response.result === 'success' && data) {
    // all is good, "redirect" to Application Server
    window.location = data;
    return reduction;
  }

  return handleFailedAPIRequest(reduction, response);
}

function* setState(reduction, state) {
  return reduction
    .setIn(['login', 'loginState'], state)
    .deleteIn(['login', 'errorMsg']);
}

// register reducers
Reducers.add(new Reducer('Login')
  .add(CONSTANTS.LOGIN.SUBMIT, submit)
  .add(CONSTANTS.LOGIN.SUBMIT_STARTED, inProgress)
  .add(CONSTANTS.LOGIN.SUBMIT_SUCCEEDED, submitSucceeded)
  .add(CONSTANTS.LOGIN.SUBMIT_FAILED, failed)

  .add(CONSTANTS.LOGIN.CREATE_ACCOUNT, createAccount)
  .add(CONSTANTS.LOGIN.CREATE_ACCOUNT_STARTED, inProgress)
  .add(CONSTANTS.LOGIN.CREATE_ACCOUNT_SUCCEEDED, createAccountSucceeded)
  .add(CONSTANTS.LOGIN.CREATE_ACCOUNT_FAILED, failed)

  .add(CONSTANTS.LOGIN.SET_STATE, setState));
