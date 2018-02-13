import getProducts from './products/get';
import applyOperations from './products/applyOperations';
import search from './products/search';
import getChannelData from './channelData';

export default {
  getChannelData: getChannelData,
  products: {
    getProducts: getProducts,
    applyOperations: applyOperations,
    search: search
  }
};
