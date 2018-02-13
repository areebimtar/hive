import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import enhanceWithClickOutside from '../../ClickOutside';

import InputField from './InputField';
import Toggle from '../../Toggle';
import Variations from './Variations';
import OfferingList from './OfferingList';
import VariationsPreview from './VariationsPreview';

const tabs = [
  { label: 'Variations', component: Variations, inputComponent: InputField },
  { label: 'Price', component: OfferingList, inputComponent: InputField, listType: 'price' },
  { label: 'Quantity', component: OfferingList, inputComponent: InputField, listType: 'quantity' },
  { label: 'SKU', component: OfferingList, inputComponent: InputField, listType: 'sku' },
  { label: 'Visibility', component: OfferingList, inputComponent: Toggle, listType: 'visibility' }
];


export class VariationsTabs extends Component {
  static propTypes = {
    variations: PropTypes.object,
    op: PropTypes.object,
    onChange: PropTypes.func,
    onSelectTab: PropTypes.func,
    onFinish: PropTypes.func,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    temporaryTaxonomyId: PropTypes.number,
    taxonomyNotSelected: PropTypes.bool
  };

  static defaultProps = {
    variations: {},
    op: null,
    onChange: _.noop,
    onSelectTab: _.noop,
    onFinish: _.noop,
    readOnly: false,
    bulk: false,
    inline: false,
    taxonomyNotSelected: false
  }

  renderTabs() {
    const { variations, op, onChange, onSelectTab, readOnly, bulk, inline, temporaryTaxonomyId, taxonomyNotSelected } = this.props;
    const activeTab = op && op.getIn(['meta', 'activeTab'], 0) || 0;
    const statuses = op && op.getIn(['meta', 'statuses']);
    const readyForOptions = op && op.getIn(['meta', 'variationsData', 'variations', 0, 'uiState', 'readyForOptions'], false);
    const getTabClasses = (tab, index) => {
      const selected = activeTab === index;
      const disabled = readOnly || taxonomyNotSelected || (index > 0 && !readyForOptions);
      const error = !readOnly && !taxonomyNotSelected && (bulk || inline) && !statuses.getIn(['data', index, 'valid'], false);
      return classNames('tab', tab.label.toLowerCase(), { selected, disabled, error });
    };
    const { component: TabComponent } = tabs[activeTab];
    const tabBodyClasses = classNames('tab-body', { 'full-height': readyForOptions && !readOnly, 'full-readonly-height': readyForOptions && readOnly });
    const tabContainerClasses = classNames('tabs-container', { 'no-taxonomy': taxonomyNotSelected });
    const handleTabClick = (e, index) => {
      e.stopPropagation();
      if (!readOnly && readyForOptions) {
        onSelectTab(index);
      }
    };

    return (
      <div className={tabContainerClasses}>
        <div className="tabs-links">
          { tabs.map((tab, index) => (<div key={tab.label} className={getTabClasses(tab, index)} onClick={(e) => handleTabClick(e, index)}>{tab.label}</div>)) }
        </div>
        <div className={tabBodyClasses} onClick={(e) => {e.stopPropagation();}}>
          { !!op && <TabComponent op={op} readOnly={readOnly} bulk={bulk} inline={inline} onChange={onChange} inputComponent={tabs[activeTab].inputComponent} listType={tabs[activeTab].listType} /> }
          { !op && <VariationsPreview variations={variations} taxonomyId={temporaryTaxonomyId} /> }
        </div>
      </div>
    );
  }

  render() {
    const { bulk, readOnly, variations } = this.props;
    const showTabs = !readOnly || _.keys(variations).length > 0;

    return (
      <div className="bulk-edit--actionform inventory-wrapper">
        { bulk && <div className="image-placeholder"><div className="vela-icon" /></div> }
        { showTabs && this.renderTabs() }
      </div>
    );
  }

  handleClickOutside() {
    this.props.onFinish();
  }
}

export default enhanceWithClickOutside(VariationsTabs);
