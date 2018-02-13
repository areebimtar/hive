import React from 'react';
import { shallow } from 'enzyme';
import {expect} from 'chai';

import ApplyProgressModal from './index';

describe('ApplyProgressModal', () => {
  it('Renders proper progress', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={5} total={10} />);
    expect(el.find('.progress-value').text()).to.eql('50%');
  });

  it('Handles 0 progress total', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={0} total={0} />);
    expect(el.find('.progress-value').text()).to.eql('0%');
  });

  it('Handles 0 progress total with non-zero progress', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={5} total={0} />);
    expect(el.find('.progress-value').text()).to.eql('0%');
  });

  it('Displays 0% with a valid total', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={0} total={10} />);
    expect(el.find('.progress-value').text()).to.eql('0%');
  });

  it('Displays 100% progress', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={5} total={5} />);
    expect(el.find('.progress-value').text()).to.eql('100%');
  });

  it('Does not show more than 100 percent progress', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={5} total={4} />);
    expect(el.find('.progress-value').text()).to.eql('100%');
  });

  it('Does not show negative progress', () => {
    const el = shallow(<ApplyProgressModal open={true} progress={-2} total={4} />);
    expect(el.find('.progress-value').text()).to.eql('0%');
  });
});
