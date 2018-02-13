import _ from 'lodash';

const invalidProps = ['initialValue', 'onUpdate', 'valid', 'invalid', 'dirty', 'pristine',
  'active', 'touched', 'visited', 'error', 'autofill', 'autofilled'];

// As of v15.2.x React complains if we pass into HTML components props that they don't recognize.
// Unfortunately, redux-form provides properties that needs to be injected into components (so they work with
// redux-form) in a object with lots of additional properties (see list above).
//
// This is simple utility function that removes these extra properties, so we don't see error in console.
export function filterInputFieldProps(field) {
  return _.omit(field, invalidProps);
}
