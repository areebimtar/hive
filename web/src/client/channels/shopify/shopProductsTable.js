import _ from 'lodash';
import moment from 'moment';
import React from 'react'; // eslint-disable-line no-unused-vars

import Column from 'app/client/channels/column';

import * as Actions from 'app/client/actions';
import { Checkbox } from 'app/client/components';
import { Thumbnail } from 'app/client/components/BulkEdit';

import * as pagination from '../infinitePagination';
import { FIELDS } from 'global/modules/shopify/constants';

const getValue = (product, field) => product.get(_.camelCase(field));

const formatDate = value => value && moment(value).format('MM/DD/YYYY');

const visible = (column, context) => {
  const columns = {
    published: ['publishedAt'],
    unpublished: []
  };

  const publishedAt = context && context.filters[FIELDS.PUBLISHED_AT];
  const isIn = (where, what) => !!where && where.indexOf(what) !== -1;
  return isIn(columns[publishedAt], column.id);
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

export default {
  // table
  getTableClass: (config, context) => {
    return `table-${context.filters[FIELDS.PUBLISHED_AT]}`;
  },
  // body
  getRowKey: (config, context, rowData, product) => getValue(product, FIELDS.ID),
  bodyRendered,
  onBodyScroll,
  prevRows,
  nextRows,
  // row
  getRowClass: (config, context, product) => product.get('selected') ? 'selected' : '',
  onRowClick: (config, context, product) => context.dispatch(Actions.Shops.toggleProduct(getValue(product, FIELDS.ID))),

  columns: [new Column({
    id: 'title',
    name: 'Title',
    class: 'title',
    value: (column, context, product) => <div><Thumbnail product={product} /><div className="title" title={getValue(product, FIELDS.TITLE)}>{getValue(product, FIELDS.TITLE)}</div></div>
  }), new Column({
    id: 'productType',
    name: 'Type',
    class: 'productType',
    value: (column, context, product) => getValue(product, FIELDS.PRODUCT_TYPE)
  }), new Column({
    id: 'vendor',
    name: 'Vendor',
    class: 'vendor',
    value: (column, context, product) => getValue(product, FIELDS.VENDOR)
  }), new Column({
    id: 'publishedAt',
    name: 'Published On',
    class: 'publishedAt',
    visible,
    value: (column, context, product) => formatDate(getValue(product, FIELDS.PUBLISHED_AT))
  }), new Column({
    id: 'updatedAt',
    name: 'Updated On',
    class: 'updatedAt',
    value: (column, context, product) => formatDate(getValue(product, FIELDS.UPDATED_AT))
  }), new Column({
    id: 'checkbox',
    headerClass: 'table-checkbox',
    name: (column, context) => <Checkbox value={context.selectedAll} onChange={() => context.dispatch(Actions.Shops.toggleAllProducts())} />,
    class: 'table-checkbox',
    value: (column, context, product) => <Checkbox value={product.get('selected')} />
  })]
};
