/**
 * Use to assert state which your program assumes to be true.
 *
 * check(condition, format, arg1, arg2, ...)
 *
 * check() throws Error, checkType throws TypeError if condition is not met
 *
 * Format is mandatory argument, followed by any number of optional arguments,
 * every %s in format is replaced by corresponding optional argument,
 * if replacment is object it is run through JSON.stringify.
 */

function formatArgument(arg) {
  if (typeof arg === 'object') {
    return JSON.stringify(arg);
  } else {
    return arg;
  }
}

function required(argName) {
  throw new TypeError(`Missing mandatory argument ${argName}`);
}

function doCheck(Constructor, condition, message = required('message'), ...args) {
  if (!condition) {
    let index = 0;
    const error = new Constructor(message.replace(/%s/g, () => formatArgument(args[index++])));
    error.name = 'Invariant Violation';
    throw error;
  }
}

const check = doCheck.bind(null, Error);
const checkType = doCheck.bind(null, TypeError);

export {check, checkType};
