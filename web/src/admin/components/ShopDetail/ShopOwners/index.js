import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ResultsTable from '../../Lookup/ResultsTable';
import { navigationOnClickHandlerCreator } from '../../../utils';

class ShopOwners extends Component {
  static propTypes = {
    owners: PropTypes.array.isRequired,
    openUserDetail: PropTypes.func.isRequired
  };

  onOwnerClicked = navigationOnClickHandlerCreator(
    (event, userId) => this.props.openUserDetail(userId),
    (event, userId) => `/admin/users/${userId}`);

  render() {
    const { owners } = this.props;

    return (
      <div className="card">
        <div className="card-content">
          <span className="card-title">Owners</span>
          <ResultsTable
            headers={ShopOwners.TABLE_HEADERS}
            columnKeys={ShopOwners.TABLE_COLUMN_KEYS}
            rows={owners}
            onResultClick={this.onOwnerClicked}  />
        </div>
      </div>
    );
  }

  static TABLE_HEADERS = ['Id', 'Email'];
  static TABLE_COLUMN_KEYS = ['id', 'email'];
}

export default ShopOwners;
