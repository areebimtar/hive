import _ from 'lodash';


export function bodyRendered(refs, config, context/* , data */) {
  // get info about new scroll position
  const tableScroll = context.tableScroll;
  if (!tableScroll) { return; }

  // get body
  const body = refs.body;
  // try row
  const row = refs[`row-${tableScroll.productId}`];
  if (row) {
    row.scrollIntoView();
  } else {
    // keep current view
    if (tableScroll.direction && _.isFinite(tableScroll.delta)) {
      if (tableScroll.direction === 'down') {
        body.scrollTop = tableScroll.delta;
      } else {
        body.scrollTop = body.scrollHeight - tableScroll.delta;
      }
    }
  }
}


export function getPrevRowsPayload(refs, /* config , context */) {
  // get body
  const body = refs.body;
  // gather row metrics
  const rows = body.getElementsByClassName('table-row');
  const rowMetrics = _.map(rows, row => row.getBoundingClientRect());
  const scrollTop = body.scrollTop;
  const scrollHeight = body.scrollHeight;
  return {rowMetrics, scrollTop, scrollHeight};
}

export function getNextRowsPayload(refs, /* config , context */) {
  // get body
  const body = refs.body;
  // gather row metrics
  const rows = body.getElementsByClassName('table-row');
  const rowMetrics = _.map(rows, row => row.getBoundingClientRect());
  const scrollTop = body.scrollTop;
  const scrollHeight = body.scrollHeight;
  return {rowMetrics, scrollTop, scrollHeight};
}
