import _ from 'lodash';
import PROPERTIES_DATA from './PROPERTIES.json';

export const COLOR = PROPERTIES_DATA[200];
export const SIZE = PROPERTIES_DATA[100];
export const DIAMETER = PROPERTIES_DATA[504];
export const DIMENSIONS = PROPERTIES_DATA[501];
export const FABRIC = PROPERTIES_DATA[502];
export const FINISH = PROPERTIES_DATA[500];
export const HEIGHT = PROPERTIES_DATA[505];
export const FLAVOR = PROPERTIES_DATA[503];
export const LENGTH = PROPERTIES_DATA[506];
export const WEIGHT = PROPERTIES_DATA[511];
export const MATERIAL = PROPERTIES_DATA[503];
export const PATTERN = PROPERTIES_DATA[508];
export const SCENT = PROPERTIES_DATA[509];
export const STYLE = PROPERTIES_DATA[510];
export const WIDTH = PROPERTIES_DATA[512];
export const DEVICE = PROPERTIES_DATA[515];

export const allProperties = PROPERTIES_DATA;
export const nonCustomProperties = _.filter(PROPERTIES_DATA, { is_custom: false });

const CUSTOM_PROPERTIES = [513, 514];
export const customProperties = _.map(CUSTOM_PROPERTIES, id => _.find(PROPERTIES_DATA, { property_id: id }));
