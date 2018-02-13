import _ from 'lodash';
import XRegExp from 'xregexp';


const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const startsWithAlphanum = (value) => {
  return (new XRegExp('^[\\p{L}\\p{N}].*')).test(value);
};

const capitalizedWordsRegexp = XRegExp('\\b\\p{Lu}{2,}\\b', 'g');
const maxNCapitalizedWords = (value, N) => {
  return XRegExp.match(value, capitalizedWordsRegexp, 'all').length <= N;
};

const onlyAllowedCharacters = (value) => {
  // https://www.etsy.com/developers/documentation/reference/listing
  // listing title regexp: /[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/u
  const reg = XRegExp('[^\\p{L}\\p{Nd}\\p{P}\\p{Sm}\\p{Zs}™©®]');
  return !reg.test(value);
};

const onlyAllowedOnce = (value, chars) => {
  let invalid = false;
  _.each(chars, char => {
    const match = value.match(new RegExp(`[${char}]`, 'g'));
    if ((!!match) ? match.length > 1 : false) { invalid = true; }
  });
  return !invalid;
};

const validateTitleWithStart = (value) => {
  let error;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Title is required';
  // must begin with aplhanum character
  } else if (!startsWithAlphanum(value)) {
    error = 'Must begin with alphanumerical character';
  // must contain max three words with all capital letters
  } else if (!maxNCapitalizedWords(value, 3)) {
    error = 'Must contain max 3 words with all capitalized letters';
  // some characters are allowed only one time
  } else if (!onlyAllowedOnce(value, ['&', '%', '\:', '\+', '\u0026', '\u0025', '\u003A', '\u002B'])) {
    error = 'Characters % : & must be used at most once';
  } else if (!onlyAllowedCharacters(value)) {
    error = 'Only alphanumeric, punctuation, ™©® characters and mathematical symbols are allowed';
  }
  return error;
};

const validateTitleWithoutStart = (value) => {
  let error;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Required';
  // must contain max three words with all capital letters
  } else if (!maxNCapitalizedWords(value, 3)) {
    error = 'Must contain max 3 words with all capitalized letters';
  // some characters are allowed only one time
  } else if (!onlyAllowedOnce(value, ['&', '%', '\:', '\+'])) {
    error = 'Characters % : & must be used at most once';
  // must contain only allowed characters
  } else if (!onlyAllowedCharacters(value)) {
    error = 'Only alphanumeric, punctuation, ™©® characters and mathematical symbols are allowed';
  }
  return error;
};

export const validate = product => {
  return validateTitleWithStart(product.get('title'));
};

export const validateAddBefore = values => {
  return {
    value: validateTitleWithStart(values && values.value)
  };
};

export const validateAddAfter = values => {
  return {
    value: validateTitleWithoutStart(values && values.value)
  };
};

export const validateReplace = values => {
  return {
    replace: validateTitleWithoutStart(values && values.replace)
  };
};

export const validateInput = values => {
  return {
    value: validateTitleWithStart(values && values.value)
  };
};
