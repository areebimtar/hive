import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';

import callCb from './callCb';


@connect()
export default class Row extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    config: PropTypes.object,
    data: PropTypes.object,
    context: PropTypes.object
  }

  componentDidMount() {
    callCb(this, this.props, 'rowMounted');
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.data !== this.props.data ||
           nextProps.config !== this.props.config ||
           !_.isEqual(nextProps.context, this.props.context);
  }

  componentDidUpdate() {
    callCb(this, this.props, 'rowRendered');
  }

  render() {
    const { config, data, context } = this.props;
    if (!config) { return <div className="table-row" />; }

    const rowClasses = classNames('table-row', callCb(this, this.props, 'getRowClass'));
    const getColumnClasses = (column) => classNames('table-row-column', column.class(context, data));
    const columns = config.columns || [];
    const filteredColumns = columns.filter(column => column.visible(context));

    return (
      <div ref="row" className={rowClasses} onClick={() => callCb(this, this.props, 'onRowClick')}>
        { filteredColumns.map(column =>
          <div key={column.id(data)} className={getColumnClasses(column)} onClick={() => config.onColumnClick && config.onColumnClick(column, context, data)}>
            { column.value(context, data) }
          </div>
        )}
      </div>
    );
  }
}
