import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// Require Editor JS files.
import 'froala-editor/js/froala_editor.pkgd.min.js';

// Require Editor CSS files.
import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';

// Require Font Awesome.
import 'font-awesome/css/font-awesome.css';

import FroalaEditor from 'react-froala-wysiwyg';
import * as parse5 from 'parse5';
import XRegExp from 'xregexp';

function stripWhiteSpaces(value) {
  const valueWithoutNewLines = XRegExp.replace(value, new XRegExp('[\n\r\u000a]', 'g'), '');
  return XRegExp.replace(valueWithoutNewLines, new XRegExp('\\s', 'g'), ' ');
}

function getNestedListIndex(node, startIndex) {
  const childNodes = _.get(node, 'childNodes', []);
  for (let i = startIndex; i < childNodes.length; ++i) {
    const childNode = childNodes[i];
    if (childNode.nodeName === 'ul' || childNode.nodeName === 'ol') {
      return i;
    }
  }
  return -1;
}

const fixLists = (object, inList) => {
  const childNodes = _.get(object, 'childNodes');
  if (!childNodes) { return object; }

  // only update <ol> <ul> tags
  if (object.nodeName === 'ol' || object.nodeName === 'ul') {
    // find all nested lists
    let nestedListIndex = 0;
    do {
      nestedListIndex = getNestedListIndex(object, nestedListIndex);
      if (nestedListIndex !== -1) {
        const previousRow = childNodes[nestedListIndex - 1];
        const nestedList = childNodes[nestedListIndex];

        // and move them into one row above
        childNodes.splice(nestedListIndex, 1);
        previousRow.childNodes.push(nestedList);
      }
    } while (nestedListIndex !== -1);
  }

  object.childNodes = _.map(childNodes, node => fixLists(node, inList));

  return object;
};

function fixNestedLists(html) {
  if (!_.isString(html) || !html) { return html; }

  const cleanHtml = stripWhiteSpaces(html);
  const fragments = parse5.parseFragment(cleanHtml, false);
  return parse5.serialize(fixLists(fragments));
}

export class FroalaHtmlInput extends Component {
  static propTypes = {
    value: PropTypes.string,
    initialValue: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    froalaActivationKey: PropTypes.string,
    placeholder: PropTypes.string,
    maxHeight: PropTypes.number
  }

  constructor(props) {
    super(props);
    const toolbarButtons = [
      'paragraphFormat', 'bold', 'italic', 'underline', '|',
      'formatOL', 'formatUL', 'outdent', 'indent', '|',
      'align', 'color', 'insertLink'
    ];

    const paragraphFormat = {
      N: 'Normal',
      H1: 'Heading 1',
      H2: 'Heading 2',
      H3: 'Heading 3',
      H4: 'Heading 4',
      H5: 'Heading 5',
      H6: 'Heading 6'
    };

    this.config = {
      key: props.froalaActivationKey,
      placeholderText: this.props.placeholder || 'Description',
      charCounterCount: false,
      immediateReactModelUpdate: true,
      toolbarButtons: toolbarButtons,
      toolbarButtonsMD: null,
      toolbarButtonsSM: null,
      toolbarButtonsXS: null,
      quickInsertTags: [],
      paragraphFormat: paragraphFormat,
      paragraphFormatSelection: true,
      heightMax: this.props.maxHeight || 400,
      linkEditButtons: ['linkOpen', 'linkRemove']
    };
  }

  shouldComponentUpdate() {
    return !this.html;
  }

  onChange = (newValue) => {
    if (newValue !== this.props.value) {
      this.html = newValue;
      this.props.onChange(newValue);
    }
  }

  render() {
    const value = fixNestedLists(this.props.value);

    return (<div onClick={event => event.stopPropagation()} >
      <FroalaEditor
        tag="textarea"
        config={this.config}
        model={value}
        onModelChange={this.onChange}
      />
    </div>);
  }
}

export default connect(state => ({
  froalaActivationKey: state.getIn(['config', 'froalaActivationKey'])
}))(FroalaHtmlInput);
