import _ from 'lodash';
import { propertySets, qualifierOptions, suggestedOptions } from './data';
import htmlencode from 'htmlencode';


const priceRegex = /\s\[.*\]$/;
const outOfStockRegex = /\s-\sOut\sof\sstock/;
const recipientSeparator = ' - ';
const recipientSeparatorLength = recipientSeparator.length;


// Etsy does partial html encoding on value and does more on formatted (argh!)
// for example "<" is encoded on both value and formattedValue but "&" is only encoded on formattedValue)
// So, we need to decode both to compare them.

const decode = (input) => _.trim(htmlencode.htmlDecode(String(input)));
const decodedContains = (formattedValue, value) =>  _.includes(decode(formattedValue), decode(value));
const decodedEquals = (formattedValue, value) => decode(formattedValue) === decode(value);

export const stripOutOfStock = (formattedValue, value) => {
  const strippedValue = String(formattedValue).replace(outOfStockRegex, '');
  // make sure that we didn't accidentally strip away part of the value (e.g. when value === "hello [there]")
  // by ensuring that the stripped value still contains the value
  return decodedContains(strippedValue, value) ? strippedValue : formattedValue;
};

export const stripPrice = (formattedValue, value) => {
  const strippedValue = String(formattedValue).replace(priceRegex, '');
  // make sure that we didn't accidentally strip away part of the value (e.g. when value === "hello [there]")
  // by ensuring that the stripped value still contains the value
  return decodedContains(strippedValue, value) ? strippedValue : formattedValue;
};

export const stripRecipient = (formattedValue, value) => {
  const result = {
    recipientId: null,
    formattedValue: formattedValue
  };

  const separatorIndex = formattedValue.lastIndexOf(recipientSeparator);
  if (separatorIndex > -1 ) {
    const recipientPrettyName = formattedValue.substring(separatorIndex + recipientSeparatorLength);
    const strippedValue = formattedValue.substring(0, separatorIndex);
    // make sure we didn't strip away part of the actual value.
    if (decodedContains(strippedValue, value)) {
      result.recipientId = qualifierOptions.getRecipientIdFromPrettyName(recipientPrettyName);
      result.formattedValue = strippedValue;
    }
  }
  return result;
};

// Etsy sometimes uses 2 spaces before a scale suffix and sometimes one, so to determine if a formatted option
// has a scale prefix or suffix, first see if the string begins/ends with the prefix or suffix, then strip whitespace,
// then compare html decoded values... (blergh)
const matchesScalePrefixOrSuffix = (scaleData, formattedValue, value) => {
  let strippedOfScale = formattedValue;
  if (scaleData.prefix) {
    if (_.startsWith(formattedValue, scaleData.prefix)) {
      strippedOfScale = _.trimLeft(formattedValue.substring(scaleData.prefix.length));
      return decodedEquals(strippedOfScale, value);
    } else {
      return undefined; // TODO: what should be returned?
    }
  } else if (scaleData.suffix) {
    if (_.endsWith(formattedValue, scaleData.suffix)) {
      const endIndex = formattedValue.length - scaleData.suffix.length;
      strippedOfScale = _.trimRight(formattedValue.substring(0, endIndex));
      return decodedEquals(strippedOfScale, value);
    } else {
      return undefined; // TODO: what should be returned?
    }
  } else {
    return decodedEquals(formattedValue, value);
  }
};

const getValidScaleIds = (taxonomyId, propertyId, recipientId) => {
  const scaleQualifier = propertySets.getScaleQualifier(taxonomyId, propertyId, recipientId);
  return _.get(scaleQualifier, 'options', []);
};

const extractMatchingScaleIds = (taxonomyId, propertyId, recipientId, formattedValue, value) => {
  const possibleScaleIds = getValidScaleIds(taxonomyId, propertyId, recipientId);
  const matchingScaleIds = [];
  _.forEach(possibleScaleIds, (scaleId) => {
    if (matchesScalePrefixOrSuffix(qualifierOptions.getScaleDataById(scaleId), formattedValue, value)) {
      matchingScaleIds.push(scaleId);
    }
  });
  return matchingScaleIds;
};

export const resolveByFormattedValue = (taxonomyId, propertyId, formattedValue, value, recipientEnum) => {
  const result = {
    recipientId: null,
    scaleId: null
  };

  // strip off any out of stock or price suffixes
  let modifiedFormattedValue = stripOutOfStock(formattedValue, value);
  modifiedFormattedValue = stripPrice(modifiedFormattedValue, value);

  // if a recipient is present on the variation, strip off any recipient string and
  // resolve the recipient id
  if (propertySets.requiresRecipient(taxonomyId, propertyId)) {
    const recipientInfo = stripRecipient(modifiedFormattedValue, value);
    modifiedFormattedValue = recipientInfo.formattedValue;

    // now we can resolve the recipient ID in one of two ways: from the enum if passed in, or from
    // the formatted value if not (doesn't work for all cases, but it's worth a shot)
    result.recipientId = qualifierOptions.getRecipientIdFromEnum(recipientEnum) || recipientInfo.recipientId;
  }

  const matchingScaleIds = extractMatchingScaleIds(taxonomyId, propertyId, result.recipientId, modifiedFormattedValue, value);
  if (matchingScaleIds.length === 1) {
    result.scaleId = matchingScaleIds[0];
  } else if (matchingScaleIds.length > 1) {
    result.possibleScaleIds = matchingScaleIds;
  }

  return result;
};

export const resolveScaleByOptionId = (taxonomyId, propertyId, recipientId, optionId) => {
  const possibleScaleIds = getValidScaleIds(taxonomyId, propertyId, recipientId);
  const matchingScaleIds = [];
  const deAliasedRecipientId = propertySets.deAliasRecipientId(taxonomyId, recipientId);
  _.forEach(possibleScaleIds, (scaleId) => {
    const suggestedOptionIds = suggestedOptions.getSuggestedOptionIds(propertyId, deAliasedRecipientId, scaleId);
    if (_.includes(suggestedOptionIds, optionId)) {
      matchingScaleIds.push(scaleId);
    }
  });
  return matchingScaleIds;
};

export const resolveQualifiersForOptionList = (taxonomyId, propertyId, optionList, recipientEnum) => {
  const finalResult = {
    recipientId: null,
    scaleId: null
  };
  const stringDeterminedResults = [];
  _.forEach(optionList, (option) => {
    stringDeterminedResults.push(resolveByFormattedValue(taxonomyId, propertyId, option.formattedValue, option.value, recipientEnum));
  });

  // find common recipientId for all items in the list
  const foundRecipientIds = [];
  _.forEach(stringDeterminedResults, (result) => {
    if (!_.includes(foundRecipientIds, result.recipientId)) {
      foundRecipientIds.push(result.recipientId);
    }
  });

  if (foundRecipientIds.length === 1) {
    finalResult.recipientId = foundRecipientIds[0];
  } else if (foundRecipientIds.length > 1) {
    // we don't really expect this to happen-- recipients are deterministic,
    // but just in case...
    finalResult.possibleRecipientIds = foundRecipientIds;
  }

  // now on to scale qualifiers...
  let scaleQualifiersExist = false;
  let scaleQualifier = null;
  let conflictFound = false;
  _.forEach(stringDeterminedResults, (result) => {
    if (result.scaleId || result.possibleScaleIds) {
      scaleQualifiersExist = true;
    }

    if (result.scaleId) {
      scaleQualifiersExist = true;
      if (scaleQualifier === null) {
        scaleQualifier = result.scaleId;
      } else if (result.scaleId !== scaleQualifier) {
        // we really don't expect this!
        conflictFound = true;
      }
    }
  });

  // if we have a match, we're done:
  if (!scaleQualifiersExist) {
    return finalResult;
  } else if (scaleQualifier && !conflictFound) {
    finalResult.scaleId = scaleQualifier;
    return finalResult;
  }

  // if we've gotten to here then we know we know qualifiers exist but we haven't found a match, let's try looking at the
  // valueIds of the options to see if they match a suggested option.
  const optionIdDeterminedResults = [];
  _.forEach(optionList, (option) => {
    optionIdDeterminedResults.push(resolveScaleByOptionId(taxonomyId, propertyId, finalResult.recipientId, option.valueId));
  });

  // now we've got an array of arrays... if any one of them has a single value it means the option is a suggested option
  // for a specific scaleId & we should be good.
  _.forEach(optionIdDeterminedResults, (matchingScaleIds) => {
    if (matchingScaleIds.length === 1) {
      finalResult.scaleId = matchingScaleIds[0];
      // don't keep iterating, we've got a winner
      return false;
    }
    return true;
  });
  // do we have a result, then let's get out of here...
  if (finalResult.scaleId) {
    return finalResult;
  }

  // at this point, we've evidently got multiple possible options and none match a suggested option for a valid scale.
  // Go back to the string-resolved ones (since they're more inclusive) and pick one.
  //
  // Give preference to one that does NOT have suggested options because that's the more likely scenario
  // (e.g. pick Other over Alpha because user probably didn't choose Alpha and then create all custom options).
  const allPossibleScaleIds = [];
  _.forEach(stringDeterminedResults, (result) => {
    _.forEach(result.possibleScaleIds, (scaleId) => {
      if (!_.includes(allPossibleScaleIds, scaleId)) {
        allPossibleScaleIds.push(scaleId);
      }
    });
  });

  _.forEach(allPossibleScaleIds, (scaleId) => {
    const suggestedOptionIds = suggestedOptions.getSuggestedOptionIds(propertyId, finalResult.recipientId, scaleId);
    if (suggestedOptionIds.length === 0) {
      finalResult.scaleId = scaleId;
      // don't process the rest, we've got a winner
      return false;
    }
    return true;
  });

  // do we have a scaleId yet? If not, grab the first option as a random guess
  if (!finalResult.scaleId && allPossibleScaleIds.length) {
    finalResult.scaleId = allPossibleScaleIds[0];
  }

  return finalResult;
};
