import Actions, {Constants} from '../actionsConstants';

const intercomActions = new Constants('Intercom')
  .add('startConversation');

// add action constants
Actions
  .add(intercomActions);

export default intercomActions.actionCreators();
