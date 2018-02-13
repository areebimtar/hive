import React from 'react';
import { mount, shallow } from 'enzyme';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import UserShops from './index';

chai.use(sinonChai);

describe('ResultsTable', () => {
  const shops = [
    {
      id: 0,
      channel_shop_id: 'channel_shop_id-0',
      name: 'name-0'
    },
    {
      id: 1,
      channel_shop_id: 'channel_shop_id-1',
      name: 'name-1',
      error: 'error-1'
    },
    {
      id: 2,
      channel_shop_id: 'channel_shop_id-2',
      name: 'name-2',
      error: 'error-2',
      other: 'other-2'
    }
  ];

  it('correctly translates shops to ResultsTable rows', () => {
    const MockResultsTable = sinon.spy(props => {
      expect(props.rows).to.not.eql(undefined);
      expect(props.rows.length).to.eql(3);

      expect(props.rows[0].id).to.eql(0);
      expect(props.rows[0].channelShopId).to.eql(shops[0].channel_shop_id);
      expect(props.rows[0].name).to.eql(shops[0].name);
      expect(shallow(props.rows[0].status).text()).to.not.eql('error');

      expect(props.rows[1].id).to.eql(1);
      expect(props.rows[1].channelShopId).to.eql(shops[1].channel_shop_id);
      expect(props.rows[1].name).to.eql(shops[1].name);
      expect(shallow(props.rows[1].status).text()).to.eql('error');

      expect(props.rows[2].id).to.eql(2);
      expect(props.rows[2].channelShopId).to.eql(shops[2].channel_shop_id);
      expect(props.rows[2].name).to.eql(shops[2].name);
      expect(shallow(props.rows[2].status).text()).to.eql('error');

      return <div>empty</div>;
    });
    UserShops.__Rewire__('ResultsTable', MockResultsTable);

    mount(<UserShops shops={shops} />);

    expect(MockResultsTable).to.have.been.called;

    UserShops.__ResetDependency__('ResultsTable');
  });
});
