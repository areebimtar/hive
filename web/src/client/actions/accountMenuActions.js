import ActionConstants, {Constants} from '../constants/actions';

const accountMenuConstants = new Constants('AccountMenu')
  .add('show')
  .add('hide')
  .add('toggle');

ActionConstants.add(accountMenuConstants);

export default accountMenuConstants.actionCreators();
