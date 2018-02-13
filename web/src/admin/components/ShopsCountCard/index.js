import React, { Component } from 'react';
import PropTypes from 'prop-types';


class ShopsCountCard extends Component {
  static propTypes = {
    count: PropTypes.number.isRequired,
    title: PropTypes.string
  };

  render() {
    const { count, title } = this.props;
    return (
      <div className="card blue lighten-2">
        <div className="card-content white-text">
          <h3 className="count">{count}</h3>
          <p className="title" >{title}</p>
        </div>
      </div>
    );
  }
}

export default ShopsCountCard;
