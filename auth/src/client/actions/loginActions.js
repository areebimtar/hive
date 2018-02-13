import Actions, {Constants} from '../actionsConstants';


const loginConstants = new Constants('Login')
  .addAsync('submit')
  .addAsync('createAccount')
  .add('setState');

// add action constants
Actions
  .add(loginConstants);

export default loginConstants.actionCreators();
