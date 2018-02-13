import _ from 'lodash';

export const variationHasOptionBasedPricing = (variation) => {
  if (!variation || !variation.first || _.isEmpty(variation.options)) { return false; }

  const firstOptionPrice = variation.options[0].price;
  if (!firstOptionPrice) { return false; }

  return !variation.options.every(option => option.price === firstOptionPrice);
};

export const variationPairHasOptionBasedPricing = (pair) => {
  const firstVariation = pair.find(variation => variation.first);
  return variationHasOptionBasedPricing(firstVariation);
};

export const immutableProductHasOptionBasedPricing = (immutableProduct) => {
  const variations = immutableProduct.has('variations') ? _.values(immutableProduct.get('variations').toJS()) : undefined;
  return variations ? variationPairHasOptionBasedPricing(variations) : false;
};
