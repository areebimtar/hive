import Actions, {Constants} from '../actionsConstants';


const resetPasswordConstants = new Constants('ResetPassword')
  .addAsync('requestReset')
  .addAsync('performReset');

// add action constants
Actions
  .add(resetPasswordConstants);

export default resetPasswordConstants.actionCreators();
