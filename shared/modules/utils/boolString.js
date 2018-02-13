import _ from 'lodash';

const TRUE = 'true';
const FALSE = 'false';

// value === true || value === 'true'
export const isTrue = (value) => String(value).toLowerCase() === TRUE;

// value === 'true' || value === 'false'
export const isBoolString = (value) => _.includes([TRUE, FALSE], value);

// typeof value === 'boolean' || value === 'true' || value === 'false'
export const isBoolOrBoolString = (value) => _.isBoolean(value) || isBoolString(value);

// convert true and 'true' to 'true', everything else to 'false'
export const toBoolString = (value) => isTrue(value) ? TRUE : FALSE;
