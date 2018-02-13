import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';

import * as Actions from '../../actions';
import { SEARCH_DEBOUNCE_INTERVAL_MS } from '../../constants/other';

import UserSearchModal from '../../components/ShopDetail/ReassignShop/UserSearchModal';
import ConfirmationModal from '../../components/ShopDetail/ReassignShop/ConfirmationModal';

import ReassignShopButton from '../../components/ShopDetail/ReassignShop/ReassignShopButton';

class ReassignShopFlow extends Component {
  static propTypes = {
    shop: PropTypes.object.isRequired,
    searchQuery: PropTypes.string.isRequired,
    searchResult: PropTypes.array.isRequired,
    selectedUser: PropTypes.object.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    init: PropTypes.func.isRequired,
    onSearchQueryChanged: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
    selectUser: PropTypes.func.isRequired,
    reassignShop: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {
      userSearchModalOpen: false,
      confirmationModalOpen: false
    };
  }

  onUserSearchModalClose = () => {
    this.setUserSearchModalOpen(false);
  }

  onConfirmationModalClose = () => {
    this.setConfirmationModalOpen(false);
  }

  onQueryChanged = query => {
    this.props.onSearchQueryChanged(query);
    this.onQueryChangedDebounced(query);
  };

  onQueryChangedDebounced = _.debounce(
    query => this.props.searchUsers(query),
    SEARCH_DEBOUNCE_INTERVAL_MS);

  onUserSelected = (event, userId) => {
    this.setState({
      userSearchModalOpen: false,
      confirmationModalOpen: true
    });
    this.props.selectUser(userId);
  };

  onReassignConfirmed = () => {
    this.setConfirmationModalOpen(false);
    this.props.reassignShop();
  };

  render() {
    const { shop, selectedUser } = this.props;
    const searchModalProps = _.pick(this.props, [
      'searchQuery', 'searchResult', 'loading', 'error'
    ]);
    return (
      <span>
        <ReassignShopButton onClick={this.openUserSearchModal} />
        <UserSearchModal {...searchModalProps}
          open={this.state.userSearchModalOpen}
          onQueryChanged={this.onQueryChanged}
          onUserSelected={this.onUserSelected}
          onClose={this.onUserSearchModalClose} />
         <ConfirmationModal shop={shop}
          user={selectedUser}
          open={this.state.confirmationModalOpen}
          onConfirmed={this.onReassignConfirmed}
          onClose={this.onConfirmationModalClose} />
      </span>
    );
  }

  openUserSearchModal = () => {
    this.props.init(this.props.shop);
    this.setUserSearchModalOpen(true);
  };

  setUserSearchModalOpen = (open) => {
    this.setState({
      ...this.state,
      userSearchModalOpen: open
    });
  }

  setConfirmationModalOpen = (open) => {
    this.setState({
      ...this.state,
      confirmationModalOpen: open
    });
  }
}

function mapStateToProps(state) {
  const searchResult = state.getIn(['reassignShop', 'searchResult']);
  const selectedUser = state.getIn(['reassignShop', 'selectedUser']);
  return {
    searchQuery: state.getIn(['reassignShop', 'searchQuery']),
    searchResult: searchResult ? searchResult.toJS() : [],
    selectedUser: selectedUser ? selectedUser.toJS() : null,
    loading: state.getIn(['reassignShop', 'loading']),
    error: state.getIn(['reassignShop', 'error'])
  };
}

const mapDispatchToProps = (dispatch) => ({
  init: shop => dispatch(Actions.ReassignShop.init(shop)),
  onSearchQueryChanged: query => dispatch(Actions.ReassignShop.onSearchQueryChanged(query)),
  searchUsers: query => dispatch(Actions.ReassignShop.searchUsers(query)),
  selectUser: userId => dispatch(Actions.ReassignShop.selectUser(userId)),
  reassignShop: () => dispatch(Actions.ReassignShop.reassignShop())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReassignShopFlow);
