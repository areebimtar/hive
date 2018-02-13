import React from 'react';
import { shallow } from 'enzyme';
import {expect} from 'chai';

import ShopsCountCard from './index';

describe('ShopsCountCard', () => {
  it('Renders proper values', () => {
    const title = 'test title';
    const count = 3;
    const el = shallow(<ShopsCountCard count={count} title={title} />);
    expect(el.find('.count').text()).to.eql(count.toString());
    expect(el.find('.title').text()).to.eql(title);
  });
});
