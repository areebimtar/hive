import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';


class ShopProductsSummary extends Component {
  static propTypes = {
    productsStateCounts: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.countsProps = [
      {title: 'Active', key: 'active'},
      {title: 'Draft', key: 'draft'},
      {title: 'Inactive', key: 'inactive'}
    ];
  }

  render() {
    const { productsStateCounts } = this.props;
    return (
      <div className="card">
        <div className="card-content">
          <span className="card-title">Listings summary</span>
          <div className="row">
            {this.countsProps.map(({ title, key }) => {
              const countElementId = `shop-detail-count-${key}`;
              return (
                <div className="col s4" key={key}>
                  <h4 className="count" id={countElementId}>
                    {_.get(productsStateCounts, key, 0)}
                  </h4>
                  <p className="title" >{title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default ShopProductsSummary;
