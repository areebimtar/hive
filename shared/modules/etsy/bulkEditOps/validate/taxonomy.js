import { List } from 'immutable';
import { validateTaxonomy } from '../../attributes/taxonomyNodeProperties';

export function validate(product) {
  const taxonomyId = product.get('taxonomy_id', null);
  if (!taxonomyId) {
    return 'Category ID must be set';
  }

  const variations = product.get('variations', new List());
  return variations.reduce((result, variation) => {
    const valid = validateTaxonomy(taxonomyId, variation.get('propertyId', null), variation.get('scalingOptionId', null));
    return (valid ? null : 'The selected category is not compatible with the variations of this listing') || result;
  }, null);
}
