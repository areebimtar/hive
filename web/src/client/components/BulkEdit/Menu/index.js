import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';


export class Menu extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    items: PropTypes.array,
    clickHandler: PropTypes.func.isRequired
  }

  render() {
    const { items, clickHandler } = this.props;
    const getClasses = (item) => {
      const classNamesConfig = {
        selected: item.selected,
        header: item.header,

        // add conditional css classes if the item has restrict or suppress values for magic feature flags
        'restrict-access': _.isString(item.access),
        [_.kebabCase(item.access)]: _.isString(item.access),
        'suppress-access': _.isString(item.suppress),
        [_.kebabCase(item.suppress)]: _.isString(item.suppress),
        'is-new': item.new
      };

      return classNames(classNamesConfig);
    };

    const getClassUpdate = (item) => classNames({ updates: item.pendingUpdates });

    return (
      <ul>
        { items && items.map(item =>
          <li key={item.id}
              onClick={() => {
                if (!item.header) { clickHandler(item.id); }
              }}
              className={getClasses(item)}>
            <span className={getClassUpdate(item)} />{item.title}
            <div className="new-banner">New</div>
          </li>)
        }
      </ul>
    );
  }
}

export default connect()(Menu);
