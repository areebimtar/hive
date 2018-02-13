import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../actionsConstants';
import { APICall } from '../utils';

function handleError(reduction, response) {
  return reduction
    .setIn(['resetPassword', 'inProgress'], false)
    .setIn(['resetPassword', 'msgSuccessfullySent'], false)
    .setIn(['resetPassword', 'errorMsg'], response.error);
}

function* requestReset(reduction, requestInfo) {
  const args = {
    method: 'post',
    url: '/resetPassword/request',
    payload: requestInfo
  };

  yield (dispatch) => dispatch(Actions.ResetPassword.requestResetStarted());
  yield (dispatch) => APICall(args).then(
    (response) => dispatch(Actions.ResetPassword.requestResetSucceeded(response)),
    (error) => dispatch(Actions.ResetPassword.requestResetFailed(error)));

  return reduction;
}

function* requestStarted(reduction) {
  return reduction
    .setIn(['resetPassword', 'inProgress'], true)
    .setIn(['resetPassword', 'msgSuccessfullySent'], false)
    .deleteIn(['resetPassword', 'errorMsg']);
}

function* requestSucceeded(reduction, response) {
  if (response && response.error) {
    return handleError(reduction, response);
  }

  return reduction
    .setIn(['resetPassword', 'inProgress'], false)
    .setIn(['resetPassword', 'msgSuccessfullySent'], true);
}

function* requestFailed(reduction, error) {
  return handleError(reduction, error);
}

function* performReset(reduction, requestInfo) {
  const args = {
    method: 'post',
    url: '/resetPassword/setPassword',
    payload: requestInfo
  };

  yield (dispatch) => dispatch(Actions.ResetPassword.performResetStarted());

  yield (dispatch) => APICall(args).then(
    (response) => dispatch(Actions.ResetPassword.performResetSucceeded(response)),
    (error) => dispatch(Actions.ResetPassword.performResetFailed(error)));

  return reduction;
}

// register reducers
Reducers.add(new Reducer('ResetPassword')
  .add(CONSTANTS.RESET_PASSWORD.REQUEST_RESET, requestReset)
  .add(CONSTANTS.RESET_PASSWORD.REQUEST_RESET_STARTED, requestStarted)
  .add(CONSTANTS.RESET_PASSWORD.REQUEST_RESET_SUCCEEDED, requestSucceeded)
  .add(CONSTANTS.RESET_PASSWORD.REQUEST_RESET_FAILED, requestFailed)

  .add(CONSTANTS.RESET_PASSWORD.PERFORM_RESET, performReset)
  .add(CONSTANTS.RESET_PASSWORD.PERFORM_RESET_STARTED, requestStarted)
  .add(CONSTANTS.RESET_PASSWORD.PERFORM_RESET_SUCCEEDED, requestSucceeded)
  .add(CONSTANTS.RESET_PASSWORD.PERFORM_RESET_FAILED, requestFailed));
