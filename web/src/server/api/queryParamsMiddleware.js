import _ from 'lodash';

// use this function instead of parseInt because parseInt will succeed if the first
// digit is an int e.g. parseInt('6foo', 10) is 6.
const convertToIntIfAppropriate = (value) => {
  if (/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
    return Number(value);
  } else {
    return value;
  }
};

// this middleware reads all query params and if it finds comma
// in its value, then it will splits it by comma and replace its value
// in query object with array
export default (req, res, next) => {
  const query = req.query;
  _.each(query, (value, key) => {
    // if param is comma separated list, split it into an array
    if (value.indexOf(',') !== -1) {
      query[key] = _(value.split(','))
        .map(convertToIntIfAppropriate)
        .filter(val => !!val || _.isNumber(val))
        .value();
    // if param string contain only number, parse it as number
    } else {
      query[key] = convertToIntIfAppropriate(value);
    }
  });
  next();
};
