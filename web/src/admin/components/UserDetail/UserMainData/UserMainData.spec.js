
import React from 'react';
import { shallow } from 'enzyme';
import {expect} from 'chai';
import _ from 'lodash';
import moment from 'moment-timezone';

import UserMainData from './index';

describe('UserMainData', () => {
  const userPropertiesToCssSelectors = {
    email: '.user-detail-title',
    id: '#user-detail-id',
    company_id: '#user-detail-company_id',
    first_name: '#user-detail-first_name',
    last_name: '#user-detail-last_name',
    last_login: '#user-detail-last_login',
    created_at: '#user-detail-created_at'
  };

  it('renders proper data', () => {
    const user = {
      email: 'User@userbase.h',
      id: 1,
      company_id: 5,
      first_name: 'John',
      last_name: 'Doe'
    };
    const el = shallow(<UserMainData user={user} />);
    _.forOwn(user, (value, key) => {
      const cssSelector = userPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(value.toString());
    });
  });

  it('properly renders and formats last_login', () => {
    const user = {
      last_login: '2017-06-22T11:50:18.119Z'
    };
    const el = shallow(<UserMainData user={user} />);
    _.forOwn(user, (value, key) => {
      const cssSelector = userPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(moment(value).format('lll'));
    });
  });

  it('properly renders and formats created_at', () => {
    const user = {
      created_at: '2017-06-22T11:50:18.119Z'
    };
    const el = shallow(<UserMainData user={user} />);
    _.forOwn(user, (value, key) => {
      const cssSelector = userPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(moment(value).format('lll'));
    });
  });
});
