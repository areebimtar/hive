// these are properties (attributes and variations) that are available for any taxonomy UNLESS they are excluded
// in the taxonomy-specific overrides
import _ from 'lodash';

export const COMMON_VARIATION_PROPERTY_IDS = [
  200, // primary color
  52047899002, // Secondary Color
  504, // Diameter
  501, // Dimensions
  502, // Fabric
  500, // Finish
  503, // Flavor
  505, // Height
  506, // Length
  507, // Material
  508, // Pattern
  509, // Scent
  100, // TeeShirtSize
  510, // Style
  511, // Weight
  512, // Width
  515, // Device
  513, // CustomProperty
  514  // CustomProperty
];

export const COMMON_ATTRIBUTE_PROPERTY_IDS = [
  200, // primary color
  46803063659, // Holiday
  46803063641, // Occasion
  52047899002  // Secondary Color
];

export const COMMON_PROPERTY_IDS = _.union(COMMON_VARIATION_PROPERTY_IDS, COMMON_ATTRIBUTE_PROPERTY_IDS);

export const CUSTOM_PROPERTY_IDS = [ 513, 514 ];


