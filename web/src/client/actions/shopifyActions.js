import ActionConstants, {Constants} from '../constants/actions';

const shopifyConstants = new Constants('Shopify')
  .add(new Constants('BulkEdit')
    .add('set_product_type')
    .add('set_vendor'));

// add shopifyConstants to action constants
ActionConstants.add(shopifyConstants);

export default shopifyConstants.actionCreators();
