import { List } from 'immutable';
import { FIELDS, ATTRIBUTES_IDS } from '../../constants';
import { getAttribute } from '../../attributes/taxonomyNodeProperties';

export function validate(product) {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return null; }

  const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', -1);
  const attributes = product.get('attributes', new List());
  const occasionAttribute = attributes.find(attribute => String(attribute.get('propertyId')) === ATTRIBUTES_IDS.OCCASION);

  const OPTIONS = getAttribute('occasion', taxonomyId).get('availableOptions', new List());
  if (OPTIONS.size === 0) {
    return 'The category of this listing does not support occasion';
  } else if (occasionAttribute && !OPTIONS.find(option => parseInt(option.get('id'), 10) === parseInt(occasionAttribute.getIn(['valueIds', 0]), 10))) {
    return `Occasion cannot be changed due to category`;
  }

  return null;
}
