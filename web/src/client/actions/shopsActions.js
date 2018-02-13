import ActionConstants, {Constants} from '../constants/actions';

const shopConstants = new Constants('Shops')
  .add('set_shop_id')

  .add('toggle_dropdown')
  .add('navigate_to_shop')

  .add('previous_products')
  .add('next_products')
  .add('close_intro_video_modal')
  .add('close_sync_status_modal')
  .add('open_sync_status_modal')
  .addAsync('update_filters')
  .add('set_main_filters')
  .addAsync('set_filters')
  .add('toggle_filter')
  .add('set_magic_options')
  .add('toggle_expanded')
  .add('toggle_product')
  .add('toggle_all_visible_products')
  .addAsync('toggle_all_products')

  .addAsync('edit_products')

  .add('clear_table_body_scroll_position');

// add shopConstants to action constants
ActionConstants.add(shopConstants);

export default shopConstants.actionCreators();
