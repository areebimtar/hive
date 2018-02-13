import React from 'react';
import { shallow } from 'enzyme';
import chai, {expect} from 'chai';
import { fromJS } from 'immutable';
import sinonChai from 'sinon-chai';

import { ProductRowQuantityInventory } from '../ProductRowQuantityInventory';
import Title from '../Title';
import Thumbnail from '../Thumbnail';
import List from '../ControlsInventory/List';
import CannotEdit from '../CannotEdit';

chai.use(sinonChai);

describe('ProductRowQuantityInventory', () => {
  it('should render Thumbnail', () => {
    const product = fromJS({can_write_inventory: true, _status: {data: {}}});
    const wrapper = shallow(<ProductRowQuantityInventory product={product}/>);
    expect(wrapper.find(Thumbnail)).to.have.length(1);
  });

  it('should render Title', () => {
    const product = fromJS({can_write_inventory: true, _status: {data: {}}});
    const wrapper = shallow(<ProductRowQuantityInventory product={product}/>);
    expect(wrapper.find(Title)).to.have.length(1);
  });

  it('should render List of options', () => {
    const product = fromJS({can_write_inventory: true, _status: {data: {}}});
    const wrapper = shallow(<ProductRowQuantityInventory product={product} />);
    expect(wrapper.find(List)).to.have.length(1);
  });

  it('should not render global error message', () => {
    const product = fromJS({can_write_inventory: true, _status: {data: {status: null}}, _formattedQuantityInventory: [{showValue: false}]});
    const wrapper = shallow(<ProductRowQuantityInventory product={product} />);
    expect(wrapper.find('.global-status .error')).to.have.length(0);
  });

  it('should render global error message', () => {
    const product = fromJS({can_write_inventory: true, _status: {data: {status: 'error'}}, _inInlineEditing: true, _formattedQuantityInventory: [{showValue: false}]});
    const wrapper = shallow(<ProductRowQuantityInventory product={product} />);
    expect(wrapper.find('.global-status .error')).to.have.length(1);
  });

  it('should render "cant update inventory" error message', () => {
    const product = fromJS({can_write_inventory: false});
    const wrapper = shallow(<ProductRowQuantityInventory product={product} />);
    const element = wrapper.find(CannotEdit);
    expect(element).to.have.length(1);
    expect(element.prop('message')).to.eql('Cannot edit inventory for "Retail & Wholesale" listings');
  });
});
