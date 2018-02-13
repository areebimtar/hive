import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';

import * as Actions from '../../actions';
import { navigationOnClickHandlerCreator } from '../../utils';
import { SEARCH_DEBOUNCE_INTERVAL_MS } from '../../constants/other';

import ErrorMessage from '../../components/Lookup/ErrorMessage';
import ResultsTable from '../../components/Lookup/ResultsTable';
import SearchBar from '../../components/Lookup/SearchBar';

class ShopsLookup extends Component {
  static propTypes = {
    searchQuery: PropTypes.string.isRequired,
    searchResult: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    init: PropTypes.func.isRequired,
    onSearchQueryCleared: PropTypes.func.isRequired,
    onSearchQueryChanged: PropTypes.func.isRequired,
    searchShops: PropTypes.func.isRequired,
    openShopDetail: PropTypes.func.isRequired
  }

  componentWillMount() {
    this.props.init();
  }

  onQueryChanged = query => {
    this.props.onSearchQueryChanged(query);
    this.onQueryChangedDebounced(query);
  };
  onQueryChangedDebounced = _.debounce(
    query => this.props.searchShops(query),
    SEARCH_DEBOUNCE_INTERVAL_MS);

  onShopClicked = navigationOnClickHandlerCreator(
    (event, shopId) => this.props.openShopDetail(shopId),
    (event, shopId) => `/admin/shops/${shopId}`);

  renderSearchResults() {
    const { searchResult } = this.props;

    const rows = searchResult.map(shop => {
      let status = null;
      if (shop.error) {
        status = <i className="material-icons red-text text-lighten-1">error</i>;
      } else {
        status = <i className="material-icons teal-text text-lighten-1">check_circle</i>;
      }

      return {
        id: shop.id,
        channelShopId: shop.channel_shop_id,
        name: shop.name,
        status
      };
    });
    return (
      <ResultsTable
        headers={ShopsLookup.RESULTS_HEADERS}
        columnKeys={ShopsLookup.RESULTS_COLUMN_KEYS}
        rows={rows}
        onResultClick={this.onShopClicked} />
    );
  }

  renderContent() {
    const {
      searchQuery, searchResult, error
    } = this.props;

    if (error) {
      return <ErrorMessage error={error} />;
    } else if (searchQuery.length === 0) {
      return <div>Type your search query above</div>;
    } else if (searchResult.length <= 0) {
      return <div>No results</div>;
    } else {
      return this.renderSearchResults();
    }
  }

  render() {
    const {
      searchQuery, loading, onSearchQueryCleared
    } = this.props;

    const progressStyle = {
      visibility: loading ? 'visible' : 'hidden'
    };
    return (
      <div>
        <SearchBar
          onQueryChanged={this.onQueryChanged}
          query={searchQuery}
          placeholder="Type in name of the shop"
          onClear={onSearchQueryCleared} />
        <div className="progress" style={progressStyle}>
          <div className="indeterminate" />
        </div>
        {this.renderContent()}
      </div>
    );
  }

  static RESULTS_HEADERS = ['Vela Shop id', 'Channel Shop id', 'Name', 'Status'];
  static RESULTS_COLUMN_KEYS = ['id', 'channelShopId', 'name', 'status'];
}

function mapStateToProps(state) {
  const searchResult = state.getIn(['shopsLookup', 'searchResult']);
  return {
    searchQuery: state.getIn(['shopsLookup', 'searchQuery']),
    searchResult: searchResult ? searchResult.toJS() : [],
    loading: state.getIn(['shopsLookup', 'loading']),
    error: state.getIn(['shopsLookup', 'error'])
  };
}

const mapDispatchToProps = (dispatch) => ({
  init: () => dispatch(Actions.ShopsLookup.init()),
  onSearchQueryCleared: () => dispatch(Actions.ShopsLookup.onSearchQueryCleared()),
  onSearchQueryChanged: query => dispatch(Actions.ShopsLookup.onSearchQueryChanged(query)),
  searchShops: query => dispatch(Actions.ShopsLookup.searchShops(query)),
  openShopDetail: shopId => dispatch(Actions.ShopsLookup.openShopDetail(shopId))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ShopsLookup);
