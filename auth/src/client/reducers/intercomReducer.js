import Reducers, { Reducer } from '../Reducer';
import CONSTANTS from '../actionsConstants';
import { CONTACT_US_EMAIL } from '../constants';

function* startConversation(reduction) {
  if ('Intercom' in window) {
    Intercom('showNewMessage'); // eslint-disable-line no-undef
  } else {
    window.open('mailto:' + CONTACT_US_EMAIL);
  }
  return reduction;
}

// register reducers
Reducers.add(new Reducer('Intercom')
  .add(CONSTANTS.INTERCOM.START_CONVERSATION, startConversation));
