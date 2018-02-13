import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import ShopsCountCard from '../../components/ShopsCountCard';
import * as Actions from '../../actions';

class Dashboard extends Component {
  static propTypes = {
    downloadShopCounts: PropTypes.func.isRequired,
    etsyShopsCount: PropTypes.number.isRequired,
    userShopsCount: PropTypes.number.isRequired
  }

  componentWillMount() {
    this.props.downloadShopCounts();
  }

  render() {
    const { etsyShopsCount, userShopsCount } = this.props;
    return (
      <div className="row">
        <div className="col s6">
          <ShopsCountCard count={etsyShopsCount} title="Channel shops" />
        </div>
        <div className="col s6">
          <ShopsCountCard count={userShopsCount} title="User shops" />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  etsyShopsCount: state.getIn(['shopCounts', 'etsyShops'], 0),
  userShopsCount: state.getIn(['shopCounts', 'userShops'], 0)
});

const mapDispatchToProps = (dispatch) => ({
  downloadShopCounts: () => dispatch(Actions.Application.downloadShopCounts())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard);
