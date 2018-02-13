import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';

import DefaultRow from './Row';
import callCb from './callCb';

import PrevNextRowsButton from './PrevNextRowsButton';


@connect()
export default class Body extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    config: PropTypes.object,
    data: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    context: PropTypes.object
  }

  componentDidMount() {
    callCb(this, this.props, 'bodyMounted');
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.data !== this.props.data ||
           nextProps.config !== this.props.config ||
           !_.isEqual(nextProps.context, this.props.context);
  }

  componentWillUpdate(nextProps) {
    callCb(this, nextProps, 'bodyRendered');
  }

  onScroll = (event) => callCb(this, this.props, 'onBodyScroll', event.target.scrollTop, event.target.scrollLeft)

  render() {
    const { config, data, context } = this.props;
    const Row = config.Row || DefaultRow;

    return (
      <div ref="body" className="table-body" onScroll={this.onScroll}>
        <PrevNextRowsButton key={`prev-${context.page.showPrev}`} onClick={() => callCb(this, this.props, 'prevRows')} text={context.page.showPrevMsg} show={context.page.showPrev} classes="table-pagination prev-button"/>
        { data && data.map(row =>
          <div ref={callCb(this, this.props, 'getRowRef', row)} key={callCb(this, this.props, 'getRowKey', row)}><Row config={config} data={row} context={context} /></div>
        )}
        <PrevNextRowsButton key={`next-${context.page.showNext}`} onClick={() => callCb(this, this.props, 'nextRows')} text={context.page.showNextMsg} show={context.page.showNext} classes="table-pagination next-button"/>
      </div>
    );
  }
}
