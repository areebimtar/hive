import * as common from '../common';

export default (/* config , models */) => async (request, response) =>
  common.logoutUser(request, response);
