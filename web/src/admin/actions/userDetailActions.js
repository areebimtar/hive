import Actions, {Constants} from '../constants/actions';


const userDetailConstants = new Constants('UserDetail')
  .addAsync('get_user_detail')
  .addAsync('impersonate_user')
  .add('clear_user_detail');

// add action constants
Actions.add(userDetailConstants);

export default userDetailConstants.actionCreators();
