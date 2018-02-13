import Actions, {Constants} from '../constants/actions';


const applicationConstants = new Constants('Application')
  .addAsync('bootstrap')
  .add('handle_shop_import')
  .add('set_shops_and_navigate')
  .add('set_profile')
  .addAsync('change_route')
  .addAsync('get_shops')
  .addAsync('get_intercom_profile')
  .add('reschedule_shops_poll')
  .add('set_interval_id')
  .add('set_shop_id')
  .add('clear_sync_flag')
  .add('set_sync_flag_timeout_id')
  .add('schedule_sync_flag_clearing')
  .add('navigate_to_shop')
  .add('navigate_to_url')
  .add('set_boolean_profile_value');

// add action constants
Actions.add(applicationConstants);

export default applicationConstants.actionCreators();
