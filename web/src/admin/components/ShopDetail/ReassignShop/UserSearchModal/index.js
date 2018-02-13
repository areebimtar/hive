import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Modal from '../../../Modal';
import ErrorMessage from '../../../Lookup/ErrorMessage';
import ResultsTable from '../../../Lookup/ResultsTable';
import SearchBar from '../../../Lookup/SearchBar';

class UserSearchModal extends Component {
  static propTypes = {
    searchQuery: PropTypes.string.isRequired,
    searchResult: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    open: PropTypes.bool.isRequired,
    onQueryChanged: PropTypes.func.isRequired,
    onUserSelected: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
  }

  renderContent() {
    const { searchQuery, searchResult, error, onUserSelected } = this.props;
    if (error) {
      return <ErrorMessage error={error} />;
    } else if (searchQuery.length === 0) {
      return <div>Type your search query above</div>;
    } else if (searchResult.length <= 0) {
      return <div>No results</div>;
    } else {
      return (
        <ResultsTable
          headers={UserSearchModal.RESULTS_HEADERS}
          columnKeys={UserSearchModal.RESULTS_COLUMN_KEYS}
          rows={searchResult}
          showArrow={false}
          onResultClick={onUserSelected} />
      );
    }
  }

  render() {
    const { open, searchQuery, onQueryChanged, loading, onClose } = this.props;
    const progressStyle = {
      visibility: loading ? 'visible' : 'hidden'
    };
    return (
      <Modal open={open} onClose={onClose}>
        <div className="modal-content">
          <h4>Select user</h4>
          <div>
            <SearchBar
              onQueryChanged={onQueryChanged}
              query={searchQuery}
              placeholder="Type in email of the user" />
            <div className="progress" style={progressStyle}>
              <div className="indeterminate" />
            </div>
            {this.renderContent()}
          </div>
        </div>
        <div className="modal-footer">
          <a className="modal-action waves-effect waves-blue btn-flat"
            onClick={onClose}>
            Cancel
          </a>
        </div>
      </Modal>
    );
  }

  static RESULTS_HEADERS = ['Id', 'Email'];
  static RESULTS_COLUMN_KEYS = ['id', 'email'];
}

export default UserSearchModal;
