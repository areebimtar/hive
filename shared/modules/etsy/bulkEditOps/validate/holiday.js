import { List } from 'immutable';
import { FIELDS, ATTRIBUTES_IDS } from '../../constants';
import { getAttribute } from '../../attributes/taxonomyNodeProperties';

export function validate(product) {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return null; }

  const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', -1);
  const attributes = product.get('attributes', new List());
  const holidayAttribute = attributes.find(attribute => String(attribute.get('propertyId')) === ATTRIBUTES_IDS.HOLIDAY);

  const OPTIONS = getAttribute('holiday', taxonomyId).get('availableOptions', new List());
  if (OPTIONS.size === 0) {
    return 'The category of this listing does not support holiday';
  } else if (holidayAttribute && !OPTIONS.find(option => parseInt(option.get('id'), 10) === parseInt(holidayAttribute.getIn(['valueIds', 0]), 10))) {
    return 'Holiday cannot be changed due to category';
  }

  return null;
}
