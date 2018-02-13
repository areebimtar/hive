import Actions, {Constants} from '../actionsConstants';


const applicationConstants = new Constants('Application')
  .addAsync('bootstrap')
  .addAsync('changeRoute')
  .add('navigateToUrl');

// add action constants
Actions
  .add(applicationConstants);

export default applicationConstants.actionCreators();
