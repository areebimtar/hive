import _ from 'lodash';
import { BULK_EDIT_VALIDATIONS } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

export const validate = product => {
  let error;
  if (_.isUndefined(product.get(FIELDS.PHOTOS))) { return undefined; }

  const photos = product.get(FIELDS.PHOTOS);
  // must be an array
  if (!photos || !photos.toJS || !_.isArray(photos.toJS())) {
    error = 'Must be an array';
  // must have correct length
  } else if (photos.toJS().length > BULK_EDIT_VALIDATIONS.PHOTOS_MAX_LENGTH) {
    error = 'Maximum number of photos reached';
  }
  return error;
};
