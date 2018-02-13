import Actions, {Constants} from '../constants/actions';


const reassignShopConstants = new Constants('ReassignShop')
  .add('init')
  .add('on_search_query_changed')
  .addAsync('search_users')
  .add('start_loading')
  .add('end_loading')
  .add('select_user')
  .addAsync('reassign_shop');

// add action constants
Actions.add(reassignShopConstants);

export default reassignShopConstants.actionCreators();
