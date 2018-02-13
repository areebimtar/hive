import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as Actions from '../../actions';
import { reduxForm } from 'redux-form';
import { filterInputFieldProps } from 'global/modules/utils/reduxForm';

class AddShopifyShop extends Component {
  static propTypes = {
    goToShopify: PropTypes.func.isRequired,
    // form props
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  };

  render() {
    const { handleSubmit, submitting, invalid, fields: { shopAdminUrlField } } = this.props;

    const inactive = shopAdminUrlField.pristine || submitting || invalid;

    return (
      <div>
        <div className="body-text">Enter your Shopify Store URL<br/>For example, https://acmecorp.myshopify.com</div>
        <form onSubmit={handleSubmit(this.addShopifyShop)}>
          <div className="input-wrapper">
            <input type="text" className="shop-name" {...filterInputFieldProps(shopAdminUrlField)} placeholder="Store URL" disabled={submitting} />
            { !shopAdminUrlField.pristine && <div className="error tooltip right">{shopAdminUrlField.error}</div> }
          </div>
          <button type="submit" className="submit-shop-name" onClick={this.addShopifyShop} disabled={inactive}>Go to Shopify</button>
        </form>
      </div>
    );
  }

  addShopifyShop = () => {
    const { goToShopify, fields: { shopAdminUrlField } } = this.props;

    goToShopify(shopAdminUrlField.value);
  }

  toggleShopifyInput = () => this.setState({ showShopifyInput: !this.state.showShopifyInput })
}

function validateUrl(values) {
  const shopAdminUrl = values.shopAdminUrlField;

  const valid = !!String(shopAdminUrl).match(/^https:\/\/([\w\d -]*)\.myshopify\.com/);

  return {
    shopAdminUrlField: !valid && 'URL is not valid'
  };
}

export default connect(() => ({}),
  (dispatch) => ({
    goToShopify: (shopName) => dispatch(Actions.Application.navigateToUrl(`/auth/shopify?shopAdminUrl=${shopName}`))
  })
)(reduxForm({
  form: 'shopNameForm',
  fields: ['shopAdminUrlField'],
  validate: validateUrl,
  getFormState: (state, reduxMountPoint) => {
    const val = state.getIn(['combined', reduxMountPoint]);
    return (val && val.toJS) ? val.toJS() : {};
  }
})(AddShopifyShop));
