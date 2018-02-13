import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';


export class ProductsPagination extends Component {
  static propTypes = {
    from: PropTypes.number,
    to: PropTypes.number,
    total: PropTypes.number,
    next: PropTypes.func,
    prev: PropTypes.func
  }

  render() {
    const { from, to, total, prev, next } = this.props;

    if (from && to && total) {
      return (
        <div>
          <span>Show <strong>{from}-{to}</strong> of {total}</span>
          <div className="button-group">
            <button className="inactive" onClick={prev} />
            <button onClick={next} />
          </div>
        </div>
      );
    }
    return <div />;
  }
}

export default connect()(ProductsPagination);
