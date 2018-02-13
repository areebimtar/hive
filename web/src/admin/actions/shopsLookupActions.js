import Actions, {Constants} from '../constants/actions';


const shopsLookupConstants = new Constants('ShopsLookup')
  .add('init')
  .add('on_search_query_cleared')
  .add('on_search_query_changed')
  .addAsync('search_shops')
  .add('open_shop_detail')
  .add('start_loading')
  .add('end_loading');

// add action constants
Actions.add(shopsLookupConstants);

export default shopsLookupConstants.actionCreators();
