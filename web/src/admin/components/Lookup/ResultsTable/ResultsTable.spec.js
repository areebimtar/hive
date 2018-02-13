import React from 'react';
import { shallow } from 'enzyme';
import { expect } from 'chai';

import ResultsTable from './index';

describe('ResultsTable', () => {
  const headers = [
    'header-1',
    'header-2',
    'header-3'
  ];
  const columnKeys = ['value1', 'value2', 'value3'];
  const rows = [
    {
      id: 4,
      value1: '4-value-1',
      value2: '4-value-2',
      value3: '4-value-3'
    },
    {
      id: 5,
      value1: '5-value-1',
      value2: '5-value-2',
      value3: '5-value-3'
    },
    {
      id: 6,
      value1: '6-value-1',
      value2: '6-value-2',
      value3: '6-value-3'
    }
  ];

  it('renders all values', () => {
    const el = shallow(
      <ResultsTable
        headers={headers}
        columnKeys={columnKeys}
        rows={rows} />
    );
    expect(el.find(`#results-header-0`).text()).to.eql(headers[0]);
    expect(el.find(`#results-header-1`).text()).to.eql(headers[1]);
    expect(el.find(`#results-header-2`).text()).to.eql(headers[2]);

    expect(el.find(`#results-row-4-value-0`).text()).to.eql(rows[0].value1);
    expect(el.find(`#results-row-4-value-1`).text()).to.eql(rows[0].value2);
    expect(el.find(`#results-row-4-value-2`).text()).to.eql(rows[0].value3);

    expect(el.find(`#results-row-5-value-0`).text()).to.eql(rows[1].value1);
    expect(el.find(`#results-row-5-value-1`).text()).to.eql(rows[1].value2);
    expect(el.find(`#results-row-5-value-2`).text()).to.eql(rows[1].value3);

    expect(el.find(`#results-row-6-value-0`).text()).to.eql(rows[2].value1);
    expect(el.find(`#results-row-6-value-1`).text()).to.eql(rows[2].value2);
    expect(el.find(`#results-row-6-value-2`).text()).to.eql(rows[2].value3);
  });
});
