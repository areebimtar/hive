import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';
import classNames from 'classnames';

import DefaultHeader from './Header';
import DefaultBody from './Body';
import callCb from './callCb';
import NoListings from './NoListings';


@connect()
export default class Table extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    config: PropTypes.object,
    data: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    context: PropTypes.object
  }

  componentDidMount() {
    callCb(this, this.props, 'tableMounted');
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.data !== this.props.data ||
           nextProps.config !== this.props.config ||
           !_.isEqual(nextProps.context, this.props.context);
  }

  componentDidUpdate() {
    callCb(this, this.props, 'tableRendered');
  }

  render() {
    const { config, data, context } = this.props;
    const Header = config.Header || DefaultHeader;
    const Body = config.Body || DefaultBody;
    const tableClasses = classNames('table', callCb(this, this.props, 'getTableClass'));
    const state = _.get(context, 'filters.state');

    return (
      <div ref="table" className={tableClasses}>
        <Header ref="header" config={config} context={context}/>
        <div ref="tableWrapper" className="table-wrap">
          <NoListings state={state} />
          <Body ref="body" config={config} data={data} context={context}/>
        </div>
      </div>
    );
  }
}
