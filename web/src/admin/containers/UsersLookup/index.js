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

class UsersLookup extends Component {
  static propTypes = {
    searchQuery: PropTypes.string.isRequired,
    searchResult: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    init: PropTypes.func.isRequired,
    onSearchQueryCleared: PropTypes.func.isRequired,
    onSearchQueryChanged: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
    openUserDetail: PropTypes.func.isRequired
  }

  componentWillMount() {
    this.props.init();
  }

  onQueryChanged = query => {
    this.props.onSearchQueryChanged(query);
    this.onQueryChangedDebounced(query);
  };

  onQueryChangedDebounced = _.debounce(
    query => this.props.searchUsers(query),
    SEARCH_DEBOUNCE_INTERVAL_MS);

  onUserClicked = navigationOnClickHandlerCreator(
    (event, userId) => this.props.openUserDetail(userId),
    (event, userId) => `/admin/users/${userId}`);

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
      return (
        <ResultsTable
          headers={UsersLookup.RESULTS_HEADERS}
          columnKeys={UsersLookup.RESULTS_COLUMN_KEYS}
          rows={searchResult}
          onResultClick={this.onUserClicked} />
      );
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
          placeholder="Type in email of the user"
          onClear={onSearchQueryCleared} />
        <div className="progress" style={progressStyle}>
          <div className="indeterminate" />
        </div>
        {this.renderContent()}
      </div>
    );
  }

  static RESULTS_HEADERS = ['Id', 'Email'];
  static RESULTS_COLUMN_KEYS = ['id', 'email'];
}

function mapStateToProps(state) {
  const searchResult = state.getIn(['usersLookup', 'searchResult']);
  return {
    searchQuery: state.getIn(['usersLookup', 'searchQuery']),
    searchResult: searchResult ? searchResult.toJS() : [],
    loading: state.getIn(['usersLookup', 'loading']),
    error: state.getIn(['usersLookup', 'error'])
  };
}

const mapDispatchToProps = (dispatch) => ({
  init: () => dispatch(Actions.UsersLookup.init()),
  onSearchQueryCleared: () => dispatch(Actions.UsersLookup.onSearchQueryCleared()),
  onSearchQueryChanged: query => dispatch(Actions.UsersLookup.onSearchQueryChanged(query)),
  searchUsers: query => dispatch(Actions.UsersLookup.searchUsers(query)),
  openUserDetail: userId => dispatch(Actions.UsersLookup.openUserDetail(userId))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UsersLookup);
