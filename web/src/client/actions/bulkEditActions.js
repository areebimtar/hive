import ActionConstants, {Constants} from '../constants/actions';


const bulkEditConstants = new Constants('BulkEdit')
  .add('select_menu_item')
  .add('reload_with_current_filters')
  .addAsync('set_filters')
  .addAsync('update_filters')
  .add('previous_products')
  .add('next_products')
  .add('toggle_all_visible_products')
  .add('toggle_product')
  .add('set_operation')
  .add('set_value')
  .add('set_operation_and_value')
  .add('set_operation_and_value_and_apply')
  .add('set_section_operation_and_value')
  .add('apply_preview_op')
  .add('set_preview_op_metadata')
  .add('set_inventory_preview_op_value')
  .add('set_inline_edit_op')
  .add('set_inline_edit_op_imm')
  .add('set_inline_edit_op_value')
  .add('set_inline_edit_op_value_and_apply')
  .add('set_inline_edit_op_and_apply')
  .add('set_inline_edit_op_metadata')
  .add('set_inventory_inline_edit_op_value')
  .add('append_inline_edit_op_value')
  .add('apply_inline_edit_op')
  .add('cancel_inline_edit_op')
  .add('add_op')
  .add('set_photos_op')
  .add('close_bulk_edit')
  .add('close_modal')
  .addAsync('sync_pending_changes')
  .add('clear_apply_operations_in_progress')
  .add('set_carousel_data')
  .addAsync('upload_image')
  .add('reset_form')
  .add('set_product_preview_status')
  .add('clear_table_body_scroll_position')
  .add('set_apply_progress_modal_shown')
  .add('set_apply_progress_modal_progress');


// add bulkEditConstants to action constants
ActionConstants.add(bulkEditConstants);

export default bulkEditConstants.actionCreators();
