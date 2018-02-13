import { fromJS } from 'immutable';
import { PAGINATION_INITIAL_LIMIT } from 'app/client/constants';

export default fromJS({
  auth: {
    user: 'sasa'
  },
  notifications: {
    errors: []
  },
  shops: {
    options: []
  },
  sectionsMap: {},
  intercom: {},
  shopView: {
    dropdown: {},
    introVideoModalOpen: true,
    syncInfoPopupOpen: false,
    shopId: null,
    filters: {
      offset: 0,
      limit: PAGINATION_INITIAL_LIMIT
    },
    expandedGroups: {},
    selectedProducts: {},
    magicOptions: []
  },
  edit: {
    shopId: null,
    products: [],
    productsPreview: [],
    filters: {
      offset: 0,
      limit: PAGINATION_INITIAL_LIMIT
    },
    selectedProducts: {},
    selectedMenuItem: 'title',
    operations: [],
    previewOperation: {
      type: 'title.addBefore'
    },
    inlineEditOp: {},
    imageData: {},
    productsPreviewStatus: {},
    applyProgressModal: {
      shown: false,
      progress: 0,
      total: 0,
      shownAt: 0
    }
  },
  userProfile: {},
  welcome: {
    shops: []
  },
  accountMenu: {
    visible: false
  },
  config: {}
});
