import React from 'react';
import { shallow } from 'enzyme';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';

import module from './VariationEdit';

chai.use(sinonChai);

describe('VariationEdit', () => {
  let props;
  let VariationEdit;

  beforeEach(() => {
    VariationEdit = module.DecoratedComponent;
    props = {
      variation: { options: [] },
      validity: 'error',
      uiState: { readyForOptions: true, availableScales: [] },
      readOnly: false,
      bulk: true,
      inline: false,
      canEnableDelete: true,
      disabledPropertyId: '123',
      first: true
    };

    module.__Rewire__('MAXIMUM_NUMBER_OF_OPTIONS', 3);
  });

  afterEach(() => {
    module.__ResetDependency__('MAXIMUM_NUMBER_OF_OPTIONS');
  });

  describe('add options', () => {
    beforeEach(() => {
      props.connectDropTarget = el => el;
    });

    it('should render enabled AddComboOption', () => {
      props.variation.options = [{}, {}];
      const wrapper = shallow(<VariationEdit {...props}/>);

      expect(wrapper.find('AddComboOption').prop('disabled')).to.eql(false);
    });

    it('should render disabled AddComboOption', () => {
      props.variation.options = [{}, {}, {}];
      const wrapper = shallow(<VariationEdit {...props}/>);

      expect(wrapper.find('AddComboOption').prop('disabled')).to.eql(true);
    });

    it('should not render AddComboOption in readOnly mode', () => {
      props.readOnly = true;
      const wrapper = shallow(<VariationEdit {...props}/>);

      expect(wrapper.find('AddComboOption').length).to.eql(0);
    });

    it('should not render AddComboOption', () => {
      props.uiState.readyForOptions = false;
      const wrapper = shallow(<VariationEdit {...props}/>);

      expect(wrapper.find('AddComboOption').length).to.eql(0);
    });

    it('should render options error', () => {
      const wrapper = shallow(<VariationEdit {...props}/>);

      expect(wrapper.find('.error-container .error').text()).to.eql('error');
    });
  });
});
