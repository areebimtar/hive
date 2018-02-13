import _ from 'lodash';
import invariant from 'invariant';
import { Map } from 'immutable';
import S from 'string';
import XRegExp from 'xregexp';
import * as parse5 from 'parse5';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import * as bodyHtml from './validate/bodyHtml';

function isEmptyHtml(value) {
  return !value || value === '<p><br></p>';
}

function getFormattedCountMessage(count) {
  if (!count) { return 'No instances found'; }
  if (count === 1) { return '1 instance found'; }
  return `${count} instances found`;
}

function cleanupString(value, escapeHtmlTags) {
  const valueWithoutNewLines = XRegExp.replace(value, new XRegExp('[\n\r\u000a]', 'g'), '');
  const valueWithoutWhiteSpaces = XRegExp.replace(valueWithoutNewLines, new XRegExp('\\s', 'g'), ' ');
  const escapedText = S(valueWithoutWhiteSpaces).escapeHTML().replaceAll('\u2022', '&bull;').s;
  return escapeHtmlTags ? escapedText : valueWithoutWhiteSpaces;
}

const addBeforeOp = (product, op, value, noFormatting) => {
  if (isEmptyHtml(value)) { return product; }

  let result = product;
  if (_.isString(value) && value) {
    if (!noFormatting) {
      const html = result.get(FIELDS.BODY_HTML, '');
      result = result.set('_formattedBodyHtml', new Map({
        value: S(value).wrapHTML('span', {class: 'add before'}).s + html
      }));
    }
    // and finally, update bodyHtml
    result = result.set(FIELDS.BODY_HTML, value + result.get(FIELDS.BODY_HTML, ''));
  }

  return result;
};

const addAfterOp = (product, op, value, noFormatting) => {
  if (isEmptyHtml(value)) { return product; }

  let result = product;
  if (_.isString(value) && value) {
    if (!noFormatting) {
      const html = result.get(FIELDS.BODY_HTML, '');
      result = result.set('_formattedBodyHtml', new Map({
        value: html + S(value).wrapHTML('span', {class: 'add after'}).s
      }));
    }
    // and finally, update bodyHtml
    result = result.set(FIELDS.BODY_HTML, result.get(FIELDS.BODY_HTML, '') + value);
  }

  return result;
};

const traverse = (object, fn) => {
  const childNodes = _.get(object, 'childNodes');
  if (!childNodes) {
    if (_.get(object, 'nodeName') === '#text') {
      return fn(object);
    }
  } else {
    object.childNodes = _.map(childNodes, node =>
      traverse(node, fn));
  }
  return object;
};

function removeEmptyHTMLTagsTraverse(object) {
  if (_.isEmpty(object.childNodes)) { return object; }

  object.childNodes = _.filter(object.childNodes, node => {
    if (node.nodeName === '#text') {
      return !!node.value;
    } else {
      return !_.isEmpty(node.childNodes);
    }
  });

  object.childNodes = _.map(object.childNodes, node =>
    removeEmptyHTMLTagsTraverse(node));

  return object;
}

function removeEmptyHTMLTags(html) {
  let oldFragments;
  let newFragments = parse5.parseFragment(html);
  do {
    oldFragments = newFragments;
    newFragments = removeEmptyHTMLTagsTraverse(_.cloneDeep(oldFragments));
  } while (!_.isEqual(oldFragments, newFragments));
  return parse5.serialize(newFragments);
}

function createHtmlToCharacterMap(html) {
  // remove all newline characters and replace white spaces with simple ' '
  const cleanHtml = cleanupString(html);
  // get html fragmets (parse html into tree structure)
  const fragments = parse5.parseFragment(cleanHtml, { locationInfo: true });

  let innerText = '';
  const characterMap = [];
  // traverse fragments tree and concatenate all text elements into one single text aka innerText
  // and build map between innerText characters and original HTML string
  traverse(fragments, (node) => {
    const offset = innerText.length;
    const value = S(node.value).escapeHTML().replaceAll('\u2022', '&bull;').s;
    innerText += value;
    for (let i = 0; i < value.length; ++i) {
      characterMap[offset + i] = node.__location.startOffset + i;
    }
  });

  return {
    html: cleanHtml,
    innerText: innerText,
    characterMap: characterMap
  };
}

function getIndexesInInnerHtml(htmlInfo, find) {
  const findRegexp = new XRegExp(XRegExp.escape(find), 'gi');
  const innerText = htmlInfo.innerText;
  const matches = S(innerText).match(findRegexp);

  let offset = 0;
  return _.map(matches, match => {
    const index = innerText.indexOf(match, offset);
    offset = index + match.length;
    return index;
  });
}

function getContinuosRangeIndex(characterMap, startIndex, findLength) {
  let rangeLength = 1;

  while ((characterMap[startIndex + rangeLength] === characterMap[startIndex + rangeLength - 1] + 1) && rangeLength < findLength) {
    rangeLength++;
  }

  return {
    startIndex: startIndex,
    endIndex: startIndex + rangeLength,
    length: rangeLength
  };
}

function catString(string, start, end) {
  return string.substring(0, start) + string.substring(end);
}

function insertString(string, start, stringToInsert) {
  return string.substring(0, start) + stringToInsert + string.substring(start);
}

function replaceHtmlPart(html, findLength, replaceFn, characterMap, startIndex, offset) {
  // find continuous range of characters (they were right next to each other in original HTML)
  const continuousRange = getContinuosRangeIndex(characterMap, startIndex, findLength);
  // translate range in character map to indexes in original HTML
  const startIndexInHtml = characterMap[continuousRange.startIndex];
  // calculate text to replace
  const originalText = html.slice(startIndexInHtml + offset, startIndexInHtml + offset + continuousRange.length);
  // remove matched text from original HTML
  const htmlWithoutRange = catString(html, startIndexInHtml + offset, startIndexInHtml + offset + continuousRange.length);
  // calculate text to insert
  const replaceText = replaceFn(originalText);
  // insert new text into original HTML
  const newHtml = insertString(htmlWithoutRange, startIndexInHtml + offset, replaceText);
  return {
    html: newHtml,
    length: continuousRange.length,
    offset: offset + replaceText.length - continuousRange.length
  };
}

function findAndReplace(html, find, replaceFn) {
  const htmlInfo = createHtmlToCharacterMap(html, find);
  const indexes = getIndexesInInnerHtml(htmlInfo, find);

  const info = _.reduce(indexes, (result, innerTextMatchIndex) => {
    // for first range, we will insert whole replace text
    let replaceInfo = replaceHtmlPart(result.html, find.length, replaceFn.bind(this, false), htmlInfo.characterMap, innerTextMatchIndex, result.offset);
    // are we done?
    if (replaceInfo.length === find.length) { return replaceInfo; }

    // no, do the rest of the match
    let findLength = find.length - replaceInfo.length;
    let innerTextMatchIndexOffset = replaceInfo.length;
    while (findLength) {
      // for consecutive ranges, we will just remove characters from match
      replaceInfo = replaceHtmlPart(replaceInfo.html, findLength, replaceFn.bind(this, true), htmlInfo.characterMap, innerTextMatchIndex + innerTextMatchIndexOffset, replaceInfo.offset);
      innerTextMatchIndexOffset = innerTextMatchIndexOffset + replaceInfo.length;
      findLength = findLength - replaceInfo.length;
    }
    return replaceInfo;
  }, { html: htmlInfo.html, offset: 0 });
  return removeEmptyHTMLTags(info.html);
}

function stripTopParagraph(html) {
  if (!_.isString(html) || !html) { return html; }
  const fragments = parse5.parseFragment(html);
  const childNodes = _.get(fragments, 'childNodes', []);

  if (!childNodes.length) { return html; }
  if (childNodes.length === 1) {
    if (childNodes[0].nodeName !== '#text') {
      childNodes[0].nodeName = 'span';
      childNodes[0].tagName = 'span';
    }
  } else {
    fragments.childNodes = _.map(childNodes, node => {
      let style = _.find(node.attrs, { name: 'style' });
      if (!style) {
        style = { name: 'style' };
        node.attrs.push(style);
      }
      style.value = style.value || '' + 'display: block;';

      node.tagName = node.nodeName === 'p' ? 'span' : node.tagName;
      node.nodeName = node.nodeName === 'p' ? 'span' : node.nodeName;
      return node;
    });
  }

  return parse5.serialize(fragments);
}

const findAndReplaceOp = (product, op, value, noFormatting) => {
  let result = product;

  if (value && !value.isEmpty() && _.isString(value.get('find')) && value.get('find')) {
    const productBodyHtml = result.get(FIELDS.BODY_HTML, '');
    const rawReplace = stripTopParagraph(value.get('replace'));
    const findValue = cleanupString(value.get('find'), true);

    if (!noFormatting) {
      let count = 0;
      const formattedFullValue = findAndReplace(productBodyHtml, findValue, (remove, textPart) => {
        if (remove) {
          return rawReplace ? '' : `<span class="replace">${textPart}</span>`;
        }
        count++;
        const css = rawReplace ? 'add' : 'replace';
        return `<span class="${css}">${rawReplace || textPart}</span>`;
      });

      // format message with remaining occurences
      const countMsg = getFormattedCountMessage(count);
      const newFormattedBodyHtml = new Map({ value: formattedFullValue, count, countMsg });
      result = result.set('_formattedBodyHtml', newFormattedBodyHtml);
    }
    // and finally, update bodyHtml
    if (_.isString(rawReplace) && rawReplace) {
      const newBodyHtml = findAndReplace(productBodyHtml, findValue, (remove) => {
        return remove ? '' : rawReplace;
      });

      result = result.set(FIELDS.BODY_HTML, newBodyHtml);
    }
  }

  return result;
};

const deleteOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    const productBodyHtml = result.get(FIELDS.BODY_HTML, '');
    const deleteValue = cleanupString(value, true);

    if (!noFormatting) {
      let count = 0;
      const formattedFullValue = findAndReplace(productBodyHtml, deleteValue, (remove, textPart) => {
        if (!remove) {
          count++;
        }
        return `<span class="del">${textPart}</span>`;
      });

      // format message with remaining occurences
      const countMsg = getFormattedCountMessage(count);
      result = result.set('_formattedBodyHtml', new Map({ value: formattedFullValue, count, countMsg }));
    }
    // and finally, update bodyHtml
    const newBodyHtml = findAndReplace(productBodyHtml, deleteValue, () => {
      return '';
    });

    result = result.set(FIELDS.BODY_HTML, newBodyHtml);
  }

  return result;
};

const setOp = (product, op, value) => {
  let result = product;
  if (_.isString(value)) {
    // update bodyHtml
    result = result.set(FIELDS.BODY_HTML, value);
  }

  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER:
      result = addAfterOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE:
      result = addBeforeOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE:
      result = findAndReplaceOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.BODY_HTML_SET:
      result = setOp(product, op, value);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // validate bodyHtml string
  const error = bodyHtml.validate(product);

  return new Map({ valid: !error, data: error });
};
