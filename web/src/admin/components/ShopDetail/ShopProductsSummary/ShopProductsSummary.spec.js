import React from 'react';
import { shallow } from 'enzyme';
import { expect } from 'chai';

import ShopProductsSummary from './index';

describe('ShopProductsSummary', () => {
  it('renders proper counts', () => {
    const productsStateCounts = {
      active: 4,
      draft: 8,
      inactive: 16
    };
    const el = shallow(
      <ShopProductsSummary productsStateCounts={productsStateCounts} />
    );
    expect(el.find('#shop-detail-count-active').text())
      .to.eql(productsStateCounts.active.toString());

    expect(el.find('#shop-detail-count-draft').text())
      .to.eql(productsStateCounts.draft.toString());

    expect(el.find('#shop-detail-count-inactive').text())
      .to.eql(productsStateCounts.inactive.toString());
  });
});
