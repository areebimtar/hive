import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';


export class Tags extends Component {
  static propTypes = {
    tags: PropTypes.object.isRequired,
    onRemoveTag: PropTypes.func.isRequired
  }

  render() {
    const { tags, onRemoveTag } = this.props;

    const getClasses = (tag) => {
      const classes = { tag: true };
      if (_.isObject(tag)) { classes[tag.get('status')] = true; }
      return classNames(classes);
    };

    const getTagName = (tag) => _.isObject(tag) && tag.get('name') || tag;

    return (
      <div className="bulk-tags" onClick={event => event.stopPropagation()}>
        { tags.map((tag) => (<div className="bulk-tags--item" key={getTagName(tag)}><span className={getClasses(tag)}><span className="close" onClick={() => onRemoveTag(getTagName(tag))}/>{getTagName(tag)}</span></div>)) }
      </div>);
  }
}

export default connect()(Tags);
