import Actions, {Constants} from '../constants/actions';


const shopDetailConstants = new Constants('ShopDetail')
  .addAsync('get_shop_detail')
  .add('clear_shop_detail')
  .addAsync('sync_shop')
  .addAsync('delete_shop')
  .addAsync('schedule_shop_detail_poll')
  .addAsync('poll_shop_detail');

// add action constants
Actions.add(shopDetailConstants);

export default shopDetailConstants.actionCreators();
