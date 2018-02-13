
// A listing in etsy can have a recipient set at the top level of the listing, in
// this case it returns the value as a lowercase string (e.g. 'teen_girls'). These
// values are documented in the API docs and are hand-transcribed here

// To create a variations, the same recipients are specified by ID which maps 1:1
// to these values. For example, teen_girls has recipient ID 266817069.

// finally, when trying to determine a recipient ID from the formatted option string,
// the options are suffixed with a hyphen and an uppercase, spaced version of the
// enum. For example, a teen_girls recipient yields a suffix of " - Teen Girls"

import _ from 'lodash';
import QUALIFIER_OPTIONS from './QUALIFIER_OPTIONS.json';

// the id and prettyName are from QUALIFIER_OPTIONS.json (returned from an etsy api call).
// the enum values are from etsy's api docs and from experimentation...
const recipientLookups = [
  {id: 266817059, prettyName: 'Men', etsyEnum: 'men' },
  {id: 266817061, prettyName: 'Women', etsyEnum: 'women' },
  {id: 266817065, prettyName: 'Unisex Adults', etsyEnum: 'unisex_adults' },
  {id: 266817067, prettyName: 'Teen Boys', etsyEnum: 'teen_boys' },
  {id: 266817069, prettyName: 'Teen Girls', etsyEnum: 'teen_girls' },
  {id: 266817071, prettyName: 'Teens', etsyEnum: 'teens' },
  {id: 266817073, prettyName: 'Boys', etsyEnum: 'boys' },
  {id: 266817077, prettyName: 'Girls', etsyEnum: 'girls' },
  {id: 266817079, prettyName: 'Children', etsyEnum: 'children' },
  {id: 266817081, prettyName: 'Baby Boys', etsyEnum: 'baby_boys' },
  {id: 266817083, prettyName: 'Baby Girls', etsyEnum: 'baby_girls' },
  {id: 266817085, prettyName: 'Babies', etsyEnum: 'babies' },
  {id: 266817087, prettyName: 'Birds', etsyEnum: 'birds' },
  {id: 301958802, prettyName: 'Cats', etsyEnum: 'cats' },
  {id: 301959052, prettyName: 'Dogs', etsyEnum: 'dogs' },
  {id: 301959242, prettyName: 'Pets', etsyEnum: 'pets' },
  {id: 302326609, prettyName: 'Not specified', etsyEnum: 'not_specified'}
];

const scaleLookups = [
  {id: 400, prettyName: 'UK Ring Size', prefix: 'UK'},
  {id: 377, prettyName: 'JP', prefix: 'JP'},
  {id: 376, prettyName: 'EU', prefix: 'EU'},
  {id: 375, prettyName: 'UK', prefix: 'UK'},
  {id: 374, prettyName: 'JP', prefix: 'JP'},
  {id: 373, prettyName: 'EU', prefix: 'EU'},
  {id: 372, prettyName: 'UK', prefix: 'UK'},
  {id: 371, prettyName: 'JP', prefix: 'JP'},
  {id: 370, prettyName: 'EU', prefix: 'EU'},
  {id: 369, prettyName: 'UK', prefix: 'UK'},
  {id: 368, prettyName: 'JP', prefix: 'JP'},
  {id: 367, prettyName: 'EU', prefix: 'EU'},
  {id: 366, prettyName: 'UK', prefix: 'UK'},
  {id: 365, prettyName: 'JP', prefix: 'JP'},
  {id: 364, prettyName: 'EU', prefix: 'EU'},
  {id: 363, prettyName: 'UK', prefix: 'UK'},
  {id: 362, prettyName: 'US', prefix: 'US'},
  {id: 361, prettyName: 'EU', prefix: 'EU'},
  {id: 378, prettyName: 'UK', prefix: 'UK'},
  {id: 379, prettyName: 'EU', prefix: 'EU'},
  {id: 380, prettyName: 'JP', prefix: 'JP'},
  {id: 399, prettyName: 'EU', prefix: 'EU'},
  {id: 398, prettyName: 'JP', prefix: 'JP'},
  {id: 397, prettyName: 'EU', prefix: 'EU'},
  {id: 396, prettyName: 'UK', prefix: 'UK'},
  {id: 395, prettyName: 'JP', prefix: 'JP'},
  {id: 394, prettyName: 'EU', prefix: 'EU'},
  {id: 393, prettyName: 'JP', prefix: 'JP'},
  {id: 392, prettyName: 'EU', prefix: 'EU'},
  {id: 391, prettyName: 'UK', prefix: 'UK'},
  {id: 388, prettyName: 'EU', prefix: 'EU'},
  {id: 387, prettyName: 'UK', prefix: 'UK'},
  {id: 386, prettyName: 'JP', prefix: 'JP'},
  {id: 385, prettyName: 'EU', prefix: 'EU'},
  {id: 384, prettyName: 'UK', prefix: 'UK'},
  {id: 383, prettyName: 'JP', prefix: 'JP'},
  {id: 382, prettyName: 'EU', prefix: 'EU'},
  {id: 381, prettyName: 'UK', prefix: 'UK'},
  {id: 360, prettyName: 'JP', prefix: 'JP'},
  {id: 359, prettyName: 'UK', prefix: 'UK'},
  {id: 358, prettyName: 'JP', prefix: 'JP'},
  {id: 389, prettyName: 'JP', prefix: 'JP'},
  {id: 301, prettyName: 'Alpha', prefix: ''},
  {id: 335, prettyName: 'Fluid Ounces', suffix: 'fl oz'},
  {id: 353, prettyName: 'UK', prefix: 'UK'},
  {id: 354, prettyName: 'EU', prefix: 'EU'},
  {id: 356, prettyName: 'UK', prefix: 'UK'},
  {id: 357, prettyName: 'EU', prefix: 'EU'},
  {id: 355, prettyName: 'JP', prefix: 'JP'},
  {id: 302, prettyName: 'US', prefix: 'US'},
  {id: 336, prettyName: 'Millilitres', suffix: 'mL'},
  {id: 303, prettyName: 'Months'},
  {id: 337, prettyName: 'Litres', suffix: 'L'},
  {id: 304, prettyName: 'Years'},
  {id: 305, prettyName: 'US', prefix: 'US'},
  {id: 306, prettyName: 'US', prefix: 'US'},
  {id: 307, prettyName: 'US', prefix: 'US'},
  {id: 308, prettyName: 'US', prefix: 'US'},
  {id: 309, prettyName: 'US', prefix: 'US'},
  {id: 310, prettyName: 'US', prefix: 'US'},
  {id: 311, prettyName: 'US', prefix: 'US'},
  {id: 312, prettyName: 'US', prefix: 'US'},
  {id: 313, prettyName: 'US Plus Size'},
  {id: 314, prettyName: 'US', prefix: 'US'},
  {id: 315, prettyName: 'US', prefix: 'US'},
  {id: 316, prettyName: 'US', prefix: 'US'},
  {id: 317, prettyName: 'US', prefix: 'US'},
  {id: 318, prettyName: 'US', prefix: 'US'},
  {id: 319, prettyName: 'US', prefix: 'US'},
  {id: 320, prettyName: 'US', prefix: 'US'},
  {id: 321, prettyName: 'US', prefix: 'US'},
  {id: 322, prettyName: 'US', prefix: 'US'},
  {id: 323, prettyName: 'US', prefix: 'US'},
  {id: 324, prettyName: 'US', prefix: 'US'},
  {id: 325, prettyName: 'US', prefix: 'US'},
  {id: 327, prettyName: 'Inches', suffix: 'inches'},
  {id: 326, prettyName: 'US', prefix: 'US'},
  {id: 328, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 329, prettyName: 'Other'},
  {id: 330, prettyName: 'US Ring Size', prefix: 'US'},
  {id: 331, prettyName: 'Ounces', suffix: 'oz'},
  {id: 332, prettyName: 'Pounds', suffix: 'lbs'},
  {id: 333, prettyName: 'Grams', suffix: 'g'},
  {id: 334, prettyName: 'Kilograms', suffix: 'kg'},
  {id: 341, prettyName: 'Inches', suffix: 'inches'},
  {id: 342, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 343, prettyName: 'Other'},
  {id: 344, prettyName: 'Inches', suffix: 'inches'},
  {id: 345, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 346, prettyName: 'Other'},
  {id: 347, prettyName: 'Inches', suffix: 'inches'},
  {id: 348, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 349, prettyName: 'Other'},
  {id: 350, prettyName: 'Inches', suffix: 'inches'},
  {id: 351, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 352, prettyName: 'Other'},
  {id: 338, prettyName: 'Inches', suffix: 'inches'},
  {id: 339, prettyName: 'Centimeters', suffix: 'cm'},
  {id: 340, prettyName: 'Other'}
];

const getRecipientIdFromOtherField = (otherFieldName, otherFieldValue) => {
  const findMatch = {};
  findMatch[otherFieldName] = otherFieldValue;
  const matchedItem = _.find(recipientLookups, findMatch);
  return _.get(matchedItem, 'id', null);
};

export const getRecipientIdFromEnum = (enumValue) => getRecipientIdFromOtherField('etsyEnum', enumValue);
export const getRecipientIdFromPrettyName = (prettyName) => getRecipientIdFromOtherField('prettyName', prettyName);
export const getRecipientEnumFromId = (recipientId) => _.get(_.find(recipientLookups, { id: recipientId }), 'etsyEnum', null);
export const getRecipientDataById = (id) => _.find(recipientLookups, {id: id});

export const getScaleDataById = (id) => _.find(scaleLookups, {id: id});
export const getPrettyName = (id) => QUALIFIER_OPTIONS[id] || null;
