import ActionConstants, {Constants} from '../constants/actions';

const etsyConstants = new Constants('Etsy')
  .add(new Constants('Shops')
    .add('set_state_filter'));

// add etsyConstants to action constants
ActionConstants.add(etsyConstants);

export default etsyConstants.actionCreators();
