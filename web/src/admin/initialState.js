import { fromJS } from 'immutable';

export default fromJS({
  shopCounts: {
    userShops: 0,
    etsyShops: 0
  },
  shopsLookup: {
    searchQuery: '',
    searchResult: [],
    loading: false
  },
  shopDetail: {
    loading: false,
    syncInProgress: false
  },
  usersLookup: {
    searchQuery: '',
    searchResult: [],
    loading: false
  },
  userDetail: {
    loading: false
  },
  reassignShop: {
    searchQuery: '',
    searchResult: [],
    loading: false,
    selectedUser: {}
  },
  impersonation: {
    impersonating: false
  }
});
