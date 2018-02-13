import React from 'react'; // eslint-disable-line no-unused-vars
import _ from 'lodash';

import Column from 'app/client/channels/column';

import * as Actions from 'app/client/actions';
import { Checkbox, BulkEdit } from 'app/client/components';

import * as pagination from './infinitePagination';


const visible = (column, context) => {
  return !!column && !!context && column.id === context.type;
};

const value = (menuComponents, column, context, product) => {
  const { ProductRow } = BulkEdit;

  const item = context && menuComponents[context.type];
  const Component = item && item.productRow && BulkEdit[item.productRow];
  if (!Component) { return <ProductRow product={product} context={context}/>; }

  return <Component product={product} context={context} />;
};

const classes = (column) => `table-${column.id}`;

const getColumns = (menuComponents) => {
  return _.map(menuComponents, (item, id) => (new Column({ id, visible, value: value.bind(null, menuComponents), class: classes })))
    .concat(new Column({ id: 'checkbox', class: 'table-checkbox', value: (column, context, product) => <Checkbox value={product.get('_selected')} /> }));
};

function bodyRendered(config, context) {
  pagination.bodyRendered(this.refs, config, context);
}

function onBodyScroll(config, context, data, scrollTop, scrollLeft) {
  context.dispatch(Actions.BulkEdit.clearTableBodyScrollPosition({scrollTop, scrollLeft}));
}

function prevRows(config, context) {
  context.dispatch(Actions.BulkEdit.previousProducts(pagination.getPrevRowsPayload(this.refs, config, context)));
}

function nextRows(config, context) {
  context.dispatch(Actions.BulkEdit.nextProducts(pagination.getNextRowsPayload(this.refs, config, context)));
}

export default function getConfig(menuComponents) {
  return {
    disableHeader: true,
    // body
    prevRows,
    nextRows,
    getRowRef: (config, context, rowData, product) => `row-${product.get('id')}`,
    getRowKey: (config, context, rowData, product) => product.get('id'),
    // row
    getRowClass: (config, context, rowData) => !!rowData.get('_selected') ? 'selected' : '',
    onRowClick: (config, context, rowData) => context.dispatch(Actions.BulkEdit.toggleProduct(rowData.get('id'))),

    bodyRendered,
    onBodyScroll,

    columns: getColumns(menuComponents)
  };
}
