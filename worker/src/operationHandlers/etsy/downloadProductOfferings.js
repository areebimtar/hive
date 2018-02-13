import _ from 'lodash';
import { AllHtmlEntities } from 'html-entities';
import { check } from '../../../../shared/modules/utils/check';

const entities = new AllHtmlEntities();

function getProductOfferingsWithVariationOptionIds(productOfferingsWithValueIds, valueIdToVariationOptionIds) {
  return _.map(productOfferingsWithValueIds, productOffering => {
    return {
      ...productOffering,
      optionIds: _.compact(_.map(productOffering.valueIds, (valueId, optionIndex) => {
        check(_.isObject(valueIdToVariationOptionIds[optionIndex]), `Missing variation option for product offering variation option ${optionIndex}`);
        const value = entities.decode(productOffering.values[optionIndex]);
        if (valueIdToVariationOptionIds[optionIndex][valueId]) {
          check(_.isString(valueIdToVariationOptionIds[optionIndex][valueId]), `Missing variationOption for value_id ${valueId}`);
          return valueIdToVariationOptionIds[optionIndex][valueId];
        } else {
          check(_.isString(valueIdToVariationOptionIds[optionIndex][value]), `Missing variationOption for value ${value} and value_id is ${valueId}`);
          return valueIdToVariationOptionIds[optionIndex][value];
        }
      }))
    };
  });
}

export function addProductOfferingsInventoryShops(connection, models, addVariationsResult, productOfferings, productId) {
  const productOfferingWithOptions = getProductOfferingsWithVariationOptionIds(productOfferings,
    _.pluck(addVariationsResult, 'valueIdToOptionIdMap')
    );
  return models.productOfferings.addFromProductIdUsingInventory(productId, productOfferingWithOptions, connection);
}
