import getChannelData from './channelData';
import getProducts from './products/get';
import applyOperations from './products/applyOperations';
import search from './products/search';

export default {
  getChannelData: getChannelData,
  products: {
    getProducts: getProducts,
    applyOperations: applyOperations,
    search: search
  }
};
