import ActionConstants, {Constants} from '../constants/actions';


const analyticsConstants = new Constants('Analytics')
  .add('init_config')
  .add('update_user_info')
  .add('set_shop_context')
  .add('set_app_info')
  .add('track_event');

ActionConstants.add(analyticsConstants);

export default analyticsConstants.actionCreators();
