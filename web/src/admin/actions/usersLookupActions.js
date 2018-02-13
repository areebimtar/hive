import Actions, {Constants} from '../constants/actions';


const usersLookupConstants = new Constants('UsersLookup')
  .add('init')
  .add('on_search_query_cleared')
  .add('on_search_query_changed')
  .addAsync('search_users')
  .add('open_user_detail')
  .add('start_loading')
  .add('end_loading');

// add action constants
Actions.add(usersLookupConstants);

export default usersLookupConstants.actionCreators();
