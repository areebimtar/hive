import React from 'react';
import { shallow } from 'enzyme';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';

import { List } from './List';

chai.use(sinonChai);

describe('List', () => {
  describe('readonly', () => {
    it('should render empty List', () => {
      const columns = [];
      const wrapper = shallow(<List columns={columns}/>);
      expect(wrapper.find('.items-wrapper')).to.have.length(1);
    });

    describe('global value', () => {
      let noErrorWrapper;
      let errorWrapper;

      beforeEach(() => {
        const noErrorColumns = fromJS([{
          showValue: true,
          value: 'test value',
          status: null,
          items: [],
          headers: []
        }]);
        const errorColumns = fromJS([{
          showValue: true,
          value: 'test value',
          status: 'test error',
          items: [],
          headers: []
        }]);
        noErrorWrapper = shallow(<List columns={noErrorColumns}/>);
        errorWrapper = shallow(<List columns={errorColumns}/>);
      });

      it('should render value and error components', () => {
        expect(errorWrapper.find('.read-only-value .value').text()).to.eql('test value');
        expect(errorWrapper.find('.read-only-value .error').text()).to.eql('test error');
      });

      it('The error component should have no text if no error exists', () => {
        expect(noErrorWrapper.find('.read-only-value .value').text()).to.eql('test value');
        expect(noErrorWrapper.find('.read-only-value .error').text()).to.eql('');
      });

      it('should not render render offering options', () => {
        expect(noErrorWrapper.find('.offering-property-options')).to.have.length(0);
      });
    });

    describe('single list', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: true, option: {value: 'opt11', label: 'opt11'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: true, option: {value: 'opt12', label: 'opt12'}}]},
            {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: true, option: {value: 'opt13', label: 'opt13'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={true} />);
      });

      it('should render 3 rows', () => {
        expect(wrapper.find('.option-row')).to.have.length(3);
      });

      it('should render name column', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-name-column').at(0).text()).to.eql(`opt1${i + 1}`);
        }
      });

      it('should render values', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-value-column .read-only-value .value').at(0).text()).to.eql(`val${i + 1}`);
        }
      });
    });

    describe('combination list', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: true, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}, {showValue: false, option: {value: 'opt21', label: 'opt21'}}]},
            {showValue: true, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}, {showValue: false, option: {value: 'opt22', label: 'opt22'}}]},
            {showValue: true, value: 'val3', status: 'err3', visible: true, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}, {showValue: false, option: {value: 'opt23', label: 'opt23'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={true} />);
      });

      it('should render 3 rows', () => {
        expect(wrapper.find('.option-row')).to.have.length(3);
      });

      it('should render name column', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-name-column').at(0).text()).to.eql(`opt1${i + 1}`);
        }
      });

      it('should render values', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-value-column .read-only-value .value').at(0).text()).to.eql(`val${i + 1}`);
        }
      });
    });
  });

  describe('editing', () => {
    it('should render empty List', () => {
      const columns = [];
      const wrapper = shallow(<List columns={columns} readOnly={false}/>);
      expect(wrapper.find('.items-wrapper')).to.have.length(1);
    });

    describe('global value', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: true,
          value: 'test value',
          status: 'test error',
          items: [],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render value', () => {
        const input = wrapper.find('.property-value-column .value-input-box');

        expect(input).to.have.length(1);
        expect(input.at(0).prop('value')).to.eql('test value');
      });

      it('should render status', () => {
        const input = wrapper.find('.property-value-column .value-input-box');

        expect(input).to.have.length(1);
        expect(input.at(0).prop('status')).to.eql('test error');
      });

      it('should not render render offering options', () => {
        expect(wrapper.find('.offering-property-options')).to.have.length(0);
      });
    });

    describe('single list', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: true, option: {value: 'opt1', label: 'opt1'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: true, option: {value: 'opt2', label: 'opt2'}}]},
            {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: true, option: {value: 'opt3', label: 'opt3'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render 3 rows', () => {
        expect(wrapper.find('.option-row')).to.have.length(3);
      });

      it('should render name column', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-name-column').at(0).text()).to.eql(`opt${i + 1}`);
        }
      });

      it('should render values', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-value-column .value-input-box').at(0).prop('value')).to.eql(`val${i + 1}`);
          expect(row.find('.property-value-column .value-input-box').at(0).prop('status')).to.eql(`err${i + 1}`);
        }
      });
    });

    describe('double list global value', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}]},
            {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}]}
          ],
          headers: []
        }, {
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt21', label: 'opt21'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt22', label: 'opt22'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render 2 columns', () => {
        expect(wrapper.find('.offering-property-item')).to.have.length(2);
      });

      it('should render rows', () => {
        const columns = wrapper.find('.offering-property-item');
        expect(columns.at(0).find('.option-row')).to.have.length(3);
        expect(columns.at(1).find('.option-row')).to.have.length(2);
      });

      it('should render name columns', () => {
        const columns = wrapper.find('.offering-property-item');

        let rows = columns.at(0).find('.option-row');
        expect(rows).to.have.length(3);

        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt11');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt12');
        expect(rows.at(2).find('.property-name-column').at(0).text()).to.eql('opt13');

        rows = columns.at(1).find('.option-row');
        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt21');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt22');
      });

      it('should not render values', () => {
        expect(wrapper.find('.property-value-column .value-input-box')).to.have.length(0);
      });
    });

    describe('double list value on left column', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: true, option: {value: 'opt11', label: 'opt11'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: true, option: {value: 'opt12', label: 'opt12'}}]},
            {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: true, option: {value: 'opt13', label: 'opt13'}}]}
          ],
          headers: []
        }, {
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt21', label: 'opt21'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt22', label: 'opt22'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render 2 columns', () => {
        expect(wrapper.find('.offering-property-item')).to.have.length(2);
      });

      it('should render rows', () => {
        const columns = wrapper.find('.offering-property-item');
        expect(columns.at(0).find('.option-row')).to.have.length(3);
        expect(columns.at(1).find('.option-row')).to.have.length(2);
      });

      it('should render name columns', () => {
        const columns = wrapper.find('.offering-property-item');

        let rows = columns.at(0).find('.option-row');
        expect(rows).to.have.length(3);

        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt11');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt12');
        expect(rows.at(2).find('.property-name-column').at(0).text()).to.eql('opt13');

        rows = columns.at(1).find('.option-row');
        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt21');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt22');
      });

      it('should render values only on left column', () => {
        const columns = wrapper.find('.offering-property-item');

        let rows = columns.at(0).find('.option-row');
        expect(rows).to.have.length(3);

        expect(rows.at(0).find('.property-value-column .value-input-box').at(0).prop('value')).to.eql('val1');
        expect(rows.at(1).find('.property-value-column .value-input-box').at(0).prop('value')).to.eql('val2');
        expect(rows.at(2).find('.property-value-column .value-input-box').at(0).prop('value')).to.eql('val3');

        rows = columns.at(1).find('.option-row');
        expect(rows.find('.property-value-column')).to.have.length(0);
      });

      it('should render statuses only on left column', () => {
        const columns = wrapper.find('.offering-property-item');

        let rows = columns.at(0).find('.option-row');
        expect(rows).to.have.length(3);

        expect(rows.at(0).find('.property-value-column .value-input-box').at(0).prop('status')).to.eql('err1');
        expect(rows.at(1).find('.property-value-column .value-input-box').at(0).prop('status')).to.eql('err2');
        expect(rows.at(2).find('.property-value-column .value-input-box').at(0).prop('status')).to.eql('err3');

        rows = columns.at(1).find('.option-row');
        expect(rows.find('.property-value-column')).to.have.length(0);
      });
    });

    describe('double list value on right column', () => {
      let wrapper;
      let rows;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}]},
            {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}]}
          ],
          headers: []
        }, {
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: true, option: {value: 'opt21', label: 'opt21'}}]},
            {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: true, option: {value: 'opt22', label: 'opt22'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render 2 columns', () => {
        expect(wrapper.find('.offering-property-item')).to.have.length(2);
      });

      it('should render rows', () => {
        const columns = wrapper.find('.offering-property-item');
        expect(columns.at(0).find('.option-row')).to.have.length(3);
        expect(columns.at(1).find('.option-row')).to.have.length(2);
      });

      it('should render name columns', () => {
        const columns = wrapper.find('.offering-property-item');

        rows = columns.at(1).find('.option-row');
        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt21');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt22');

        rows = columns.at(0).find('.option-row');
        expect(rows).to.have.length(3);

        expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt11');
        expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt12');
        expect(rows.at(2).find('.property-name-column').at(0).text()).to.eql('opt13');
      });

      it('should render values only on right column', () => {
        const columns = wrapper.find('.offering-property-item');

        rows = columns.at(0).find('.option-row');
        expect(rows.find('.property-value-column')).to.have.length(0);

        rows = columns.at(1).find('.option-row');
        expect(rows).to.have.length(2);

        expect(rows.at(0).find('.property-value-column .value-input-box').at(0).prop('value')).to.eql('val1');
        expect(rows.at(1).find('.property-value-column .value-input-box').at(0).prop('value')).to.eql('val2');
      });

      it('should render statuses only on right column', () => {
        const columns = wrapper.find('.offering-property-item');

        rows = columns.at(0).find('.option-row');
        expect(rows.find('.property-value-column')).to.have.length(0);

        rows = columns.at(1).find('.option-row');
        expect(rows).to.have.length(2);

        expect(rows.at(0).find('.property-value-column .value-input-box').at(0).prop('status')).to.eql('err1');
        expect(rows.at(1).find('.property-value-column .value-input-box').at(0).prop('status')).to.eql('err2');
      });
    });

    describe('combination list', () => {
      let wrapper;

      beforeEach(() => {
        const columns = fromJS([{
          showValue: false,
          value: null,
          status: null,
          items: [
            {showValue: true, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}, {showValue: false, option: {value: 'opt21', label: 'opt21'}}]},
            {showValue: true, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}, {showValue: false, option: {value: 'opt22', label: 'opt22'}}]},
            {showValue: true, value: 'val3', status: 'err3', visible: true, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}, {showValue: false, option: {value: 'opt23', label: 'opt23'}}]}
          ],
          headers: []
        }]);
        wrapper = shallow(<List columns={columns} readOnly={false} />);
      });

      it('should render 3 rows', () => {
        expect(wrapper.find('.option-row')).to.have.length(3);
      });

      it('should render name column', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-name-column').at(0).text()).to.eql(`opt1${i + 1}`);
        }
      });

      it('should render values', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-value-column .value-input-box').at(0).prop('value')).to.eql(`val${i + 1}`);
        }
      });

      it('should render statuses', () => {
        const rows = wrapper.find('.option-row');
        for (let i = 0; i < 3; ++i) {
          const row = rows.at(i);
          expect(row.find('.property-value-column .value-input-box').at(0).prop('status')).to.eql(`err${i + 1}`);
        }
      });
    });
  });

  describe('headers', () => {
    it('should render header on one column list', () => {
      const columns = fromJS([{
        showValue: false,
        value: null,
        status: null,
        items: [
          {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: true, option: {value: 'opt1', label: 'opt1'}}]},
          {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: true, option: {value: 'opt2', label: 'opt2'}}]},
          {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: true, option: {value: 'opt3', label: 'opt3'}}]}
        ],
        headers: ['test column header']
      }]);
      const wrapper = shallow(<List columns={columns} readOnly={false} />);

      expect(wrapper.find('.item-header > .property-name-column')).to.have.length(1);
      expect(wrapper.find('.item-header > .property-name-column').at(0).text()).to.eql('test column header');
    });

    it('should render header on two columns list', () => {
      const columns = fromJS([{
        showValue: false,
        value: null,
        status: null,
        items: [
          {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}]},
          {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}]},
          {showValue: false, value: 'val3', status: 'err3', visible: true, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}]}
        ],
        headers: []
      }, {
        showValue: false,
        value: null,
        status: null,
        items: [
          {showValue: false, value: 'val1', status: 'err1', visible: true, combination: [{showValue: false, option: {value: 'opt21'}}]},
          {showValue: false, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt22'}}]}
        ],
        headers: ['left column header', 'right column header']
      }]);
      const wrapper = shallow(<List columns={columns} readOnly={false} />);

      expect(wrapper.find('.item-header > .property-name-column')).to.have.length(2);
      expect(wrapper.find('.item-header > .property-name-column').at(0).text()).to.eql('left column header');
      expect(wrapper.find('.item-header > .property-name-column').at(1).text()).to.eql('right column header');
    });
  });

  describe('visibility', () => {
    let wrapper;

    beforeEach(() => {
      const columns = fromJS([{
        showValue: false,
        value: null,
        status: null,
        items: [
          {showValue: true, value: 'val1', status: 'err1', visible: false, combination: [{showValue: false, option: {value: 'opt11', label: 'opt11'}}, {showValue: false, option: {value: 'opt21', label: 'opt21'}}]},
          {showValue: true, value: 'val2', status: 'err2', visible: true, combination: [{showValue: false, option: {value: 'opt12', label: 'opt12'}}, {showValue: false, option: {value: 'opt22', label: 'opt22'}}]},
          {showValue: true, value: 'val3', status: 'err3', visible: false, combination: [{showValue: false, option: {value: 'opt13', label: 'opt13'}}, {showValue: false, option: {value: 'opt23', label: 'opt23'}}]}
        ],
        headers: []
      }]);
      wrapper = shallow(<List columns={columns} readOnly={false} />);
    });

    it('should render 3 rows', () => {
      expect(wrapper.find('.option-row')).to.have.length(3);
    });

    it('should render non-visible rows with different css', () => {
      const rows = wrapper.find('.option-row .not-visible');
      expect(rows).to.have.length(2);
      expect(rows.at(0).find('.property-name-column').at(0).text()).to.eql('opt11');
      expect(rows.at(0).find('.property-name-column').at(1).text()).to.eql('opt21');
      expect(rows.at(1).find('.property-name-column').at(0).text()).to.eql('opt13');
      expect(rows.at(1).find('.property-name-column').at(1).text()).to.eql('opt23');
    });
  });
});
