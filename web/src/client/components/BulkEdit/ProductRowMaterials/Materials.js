import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';


export class Materials extends Component {
  static propTypes = {
    materials: PropTypes.object.isRequired,
    onRemoveTag: PropTypes.func.isRequired
  }

  render() {
    const { materials, onRemoveTag } = this.props;

    const getClasses = (material) => {
      const classes = { material: true };
      if (_.isObject(material)) { classes[material.get('status')] = true; }
      return classNames(classes);
    };

    const getMaterialName = (material) => _.isObject(material) && material.get('name') || material;
    return (
      <span className="bulk-tags" onClick={event => event.stopPropagation()}>
        { (materials || []).map((material) => (<div className="bulk-tags--item" key={getMaterialName(material)}><span className={getClasses(material)}><span className="close" onClick={() => onRemoveTag(getMaterialName(material))}/>{getMaterialName(material)}</span></div>)) }
      </span>);
  }
}

export default connect()(Materials);
