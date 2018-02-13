import Actions, {Constants} from '../constants/actions';


const applicationConstants = new Constants('Application')
  .add('bootstrap')
  .addAsync('get_user_info')
  .addAsync('download_shop_counts')
  .addAsync('get_impersonation')
  .addAsync('stop_impersonating')
  .addAsync('change_route');

// add action constants
Actions.add(applicationConstants);

export default applicationConstants.actionCreators();
