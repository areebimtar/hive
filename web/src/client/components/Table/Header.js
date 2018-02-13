import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';

import callCb from './callCb';


@connect()
export default class Header extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    config: PropTypes.object,
    context: PropTypes.object
  }

  componentDidMount() {
    callCb(this, this.props, 'headerMounted');
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.config !== this.props.config ||
           !_.isEqual(nextProps.context, this.props.context);
  }

  componentDidUpdate() {
    callCb(this, this.props, 'headerRendered');
  }

  render() {
    const { config, context, dispatch } = this.props;
    if (!config) { return <div className="table-header" />; }

    const getColumnClasses = (column) => classNames('table-header-column', column.headerClass(context));
    const columns = config.columns || [];
    const filteredColumns = columns.filter(column => column.visible(context) && !config.disableHeader);

    return (
      <div ref="header" className="table-header">
        { filteredColumns.map(column =>
          <div key={column.id()} className={getColumnClasses(column)} onClick={() => config.onHeaderColumnClick && config.onHeaderColumnClick(dispatch, column)}>
            {column.name(context)}
          </div>
        )}
      </div>
    );
  }
}
