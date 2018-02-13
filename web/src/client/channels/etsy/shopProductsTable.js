import _ from 'lodash';
import moment from 'moment';
import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';

import Column from 'app/client/channels/column';
import { FIELDS } from 'global/modules/etsy/constants';

import * as Actions from 'app/client/actions';
import { Checkbox } from 'app/client/components';
import { Thumbnail } from 'app/client/components/BulkEdit';

import * as pagination from '../infinitePagination';


const currencyFmt = value => `$${Number(value).toFixed(2)}`;
const formatDate = value => {
  return moment.unix(value).format('M/D/YY');
};

const visible = (column, context) => {
  const columns = {
    active: ['quantity', 'price', 'expires', 'section'],
    draft: ['quantity', 'price', 'modified', 'section'],
    expired: ['quantity', 'price', 'expired'],
    sold_out: ['price', 'souldout'],
    inactive: ['quantity', 'price', 'expires', 'section']
  };

  const state = context && context.filters[FIELDS.STATE];
  const isIn = (where, what) => !!where && where.indexOf(what) !== -1;
  return isIn(columns[state], column.id);
};


function bodyRendered(config, context) {
  pagination.bodyRendered(this.refs, config, context);
}

function onBodyScroll(config, context, data, scrollTop, scrollLeft) {
  context.dispatch(Actions.Shops.clearTableBodyScrollPosition({scrollTop, scrollLeft}));
}

function prevRows(config, context) {
  context.dispatch(Actions.Shops.previousProducts(pagination.getPrevRowsPayload(this.refs, config, context)));
}

function nextRows(config, context) {
  context.dispatch(Actions.Shops.nextProducts(pagination.getNextRowsPayload(this.refs, config, context)));
}

// Component to show prices
function ShopViewPriceCell({ price, priceCount }) {
  const mainPrice = currencyFmt(price);

  if (priceCount) {
    return <div>{mainPrice} <div className="price-option-based-pricing">{priceCount - 1}</div></div>;
  }

  return <div>{mainPrice}</div>;
}

ShopViewPriceCell.propTypes = {
  price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  priceCount: PropTypes.number
};

function getLastModifiedTimestamp(product) {
  const value = product.get('_hive_last_modified_tsz');
  return _.isFinite(value) ? value : null;
}

export default {
  // table
  getTableClass: (config, context) => {
    const state = context.filters[FIELDS.STATE];
    return (state === 'edit') ? 'table-inactive' : `table-${state}`;
  },
  // body
  getRowKey: (config, context, rowData, product) => product.get('id'),
  bodyRendered,
  onBodyScroll,
  prevRows,
  nextRows,
  // row
  getRowClass: (config, context, product) => product.get('selected') ? 'selected' : '',
  onRowClick: (config, context, product) => context.dispatch(Actions.Shops.toggleProduct(product.get('id'))),

  columns: [new Column({
    id: 'title',
    name: 'Title',
    class: 'title',
    value: (column, context, product) => <div><Thumbnail product={product} /><div className="title">{product.get('title')}</div></div>
  }), new Column({
    id: 'quantity',
    name: 'In Stock',
    visible,
    value: (column, context, product) => product.get(FIELDS.QUANTITY)
  }), new Column({
    id: 'price',
    name: 'Price',
    visible,
    value: (column, context, product) => <ShopViewPriceCell priceCount={product.get('optionBasedPricesCount')}
                                                            price={product.get(FIELDS.PRICE)}/>
  }), new Column({
    id: 'expires',
    name: 'Expires On',
    class: 'expires',
    visible,
    value: (column, context, product) => formatDate(product.get(FIELDS.ENDING_TSZ))
  }), new Column({
    id: 'modified',
    name: 'Updated On',
    class: 'updated',
    visible,
    value: (column, context, product) => formatDate(getLastModifiedTimestamp(product))
  }), new Column({
    id: 'expired',
    name: 'Expired On',
    class: 'expired',
    visible,
    value: (column, context, product) => formatDate(product.get(FIELDS.ENDING_TSZ))
  }), new Column({
    id: 'souldout',
    name: 'Sould Out On',
    class: 'souldout',
    visible,
    value: (column, context, product) => formatDate(product.get(FIELDS.STATE_TSZ))
  }), new Column({
    id: 'section',
    headerClass: 'section',
    name: 'Section',
    class: 'section',
    visible,
    value: (column, context, product) => product.get(FIELDS.SECTION_ID)
  }), new Column({
    id: 'checkbox',
    headerClass: 'table-checkbox',
    name: (column, context) => <Checkbox value={context.selectedAll} onChange={() => context.dispatch(Actions.Shops.toggleAllProducts())} />,
    class: 'table-checkbox',
    value: (column, context, product) => <Checkbox value={product.get('selected')} />
  })]
};
