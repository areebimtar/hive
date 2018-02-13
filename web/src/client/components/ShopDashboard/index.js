import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import InvalidShop from './InvalidShop';

import { EditListingsButton, Table } from '../../components';
import * as Actions from '../../actions';

import { SEARCH_THROTTLE_TIMEOUT } from 'app/client/constants';
import { CHANNEL_NAMES } from 'global/constants';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';


class EtsyDashboard extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object.isRequired,
    products: PropTypes.object,
    table: PropTypes.object,
    shop: PropTypes.object,
    initialSync: PropTypes.bool,
    // form props
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired
  };

  renderImport() {
    const { shop } = this.props;

    return (
      <div className="special-page intro-page" >
        <ul className="shops">
          <li className="shop">
            <p>
              {'Syncing '}
              <span className="name">{shop.get('name')}</span>
              {' - '}
              { (shop.get('to_download') && shop.get('downloaded')) ?
                <span className="counter"><span className="done">{shop.get('downloaded')}</span> of <span className="total">{shop.get('to_download')}</span></span> :
                <span className="dots">...</span>
              }
            </p>
            <progress value={shop.get('downloaded')} max={shop.get('to_download')} />
          </li>
        </ul>
      </div>
    );
  }

  renderTable() {
    const { data, products, table, dispatch, fields: { value }, handleSubmit } = this.props;

    const context = {
      filters: data.filters,
      selectedAll: data.selectedProducts.selectedAll,
      page: data.page || {},
      tableScroll: data.tableScroll,
      dispatch
    };

    const hasNoProducts = !_.get(data, 'productsTotal') && !value.value;

    return (
      <app-dashboard--container class={ classNames({'no-listings': hasNoProducts }) }>

        <app-dashboard--menu>

          <button className="active">+ New Listing</button>

        </app-dashboard--menu>

        <app-dashboard--actions>

          <ul>
            <li><EditListingsButton selected={data.selectedProducts.selected} onClick={this.editProducts} /></li>
          </ul>

          <form onSubmit={handleSubmit(()=>{})} >
            <div className="filter-search">
              <input type="text" placeholder="Search" {...filterInputFieldProps(value)} onChange={this.doFullTextSearch} disabled={hasNoProducts} />
            </div>
          </form>

        </app-dashboard--actions>

        <app-dashboard--table>

          <Table config={table} data={products} context={context}/>

        </app-dashboard--table>

      </app-dashboard--container>
    );
  }

  render() {
    const { initialSync, shop } = this.props;
    if (shop && shop.get('invalid')) {
      const channelName = _.capitalize(CHANNEL_NAMES[shop.get('channel_id')]);
      return <InvalidShop invalidCode={shop.get('sync_status')} serverErrorMessage={shop.get('error')} channelName={channelName}/>;
    }

    return initialSync ? this.renderImport() : this.renderTable();
  }

  editProducts = () => this.props.data.selectedProducts.selected && this.props.dispatch(Actions.Shops.editProducts())

  toggleAllVisibleProducts = () => this.props.dispatch(Actions.Shops.toggleAllVisibleProducts())
  toggleAllProducts = () => this.props.dispatch(Actions.Shops.toggleAllProducts())

  previousProducts = () => this.props.dispatch(Actions.Shops.previousProducts())
  nextProducts = () => this.props.dispatch(Actions.Shops.nextProducts())

  doFullTextSearch = (event) => this.props.fields.value.onChange(event) && this.updateFilters()
  updateFilters = _.throttle(() => this.props.dispatch(Actions.Shops.updateFilters({ title: this.props.fields.value.value })), SEARCH_THROTTLE_TIMEOUT, {leading: false})
}

export default connect()(
  reduxForm({
    form: 'searchQuery',
    fields: ['value'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(EtsyDashboard));
