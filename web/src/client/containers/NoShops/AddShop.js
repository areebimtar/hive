import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as Actions from '../../actions';

class AddShop extends Component {
  static propTypes = {
    goToEtsy: PropTypes.func.isRequired,
    goToShopify: PropTypes.func.isRequired
  };

  render() {
    const { goToEtsy, goToShopify } = this.props;

    return (
      <div>
        <div className="body-text">Connect your shop with Vela to get started. You can<br/>connect additional shops from either channel once<br/>your first shop has been imported</div>
        <button onClick={goToEtsy}>Go to Etsy</button>
        <button onClick={goToShopify}>Go to Shopify</button>
      </div>
    );
  }
}

export default connect(() => {},
  (dispatch) => ({
    goToEtsy: () => dispatch(Actions.Application.navigateToUrl('/auth/etsy')),
    goToShopify: () => dispatch(Actions.Application.changeRoute('/welcome/shopify'))
  })
)(AddShop);
