import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { Map } from 'immutable';

import * as Actions from '../../../actions';

import VariationsTabs from './VariationsTabs';
import TaxonomySelector from './TaxonomySelector';
import Images from '../../../img';
import Popover from '../../Popover';


class ControlsInventory extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object.isRequired
  };

  onApply = () => {
    this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }

  onSelectTab = (activeTab) => {
    this.props.dispatch(Actions.BulkEdit.setPreviewOpMetadata(new Map({ activeTab })));
  }

  onChange = (newOpValue) => {
    this.props.dispatch(Actions.BulkEdit.setInventoryPreviewOpValue(newOpValue.get('value')));
  }

  onChangeTaxonomy = (taxonomyId) => {
    this.onChange(this.props.data.setIn(['value', 'taxonomyId'], taxonomyId));
  }

  onPrefill = () => {
    this.onChange(JSON.parse('{"taxonomyId":66,"variations":[{"formattedName":"Color","options":[{"id":-3,"value":"Beige","valueId":1213,"isAvailable":null},{"id":-2,"value":"Black","valueId":1,"isAvailable":null},{"id":-1,"value":"Blue","valueId":2,"isAvailable":null}],"scalingOptionId":null,"propertyId":200, "influencesPrice":true},{"formattedName":"Size","options":[{"id":-2,"value":"XXS","valueId":1166388104,"isAvailable":null},{"id":-1,"value":"XS","valueId":1166388106,"isAvailable":null}],"scalingOptionId":301,"propertyId":100, "influencesPrice":true}],"scalingOptionId":null}'));
    this.props.dispatch(Actions.BulkEdit.setPreviewOpMetadata(new Map({ activeTab: 1 })));
  }

  render() {
    const { data } = this.props;
    const taxonomyNotSelected = !data.getIn(['value', 'taxonomyId']);
    const taxonomyData = data.getIn(['meta', 'taxonomyData']);
    const valid = data.getIn(['meta', 'valid'], false);
    const applyButtonClasses = classNames('apply', { inactive: !valid });
    const popoverText = ['Bulk edits will replace existing categories and variations for all selected listings.', 'This includes price, quantity<br>and SKU.'];

    return (
      <div className="bulk-edit-actions-list variations-inventory bulk">
        <div className="bulk-edit--actions">
          <div className="bulk-edit--actionform">
            <form>
              <TaxonomySelector
                options={taxonomyData.get('options').toJS()}
                indexes={taxonomyData.get('indexes').toJS()}
                values={taxonomyData.get('values').toJS()}
                onChange={this.onChangeTaxonomy}
                readOnly={false}
                showTip={!taxonomyData.getIn(['values', 0])}
              />
              <Popover image={Images.bulkEditIcon} title="Bulk Editing Variations" paragraphs={popoverText} arrowType="TOP_RIGHT" />
              <button type="button" className={applyButtonClasses} disabled={!valid} onClick={this.onApply}>Apply</button>
            </form>
          </div>
        </div>
        <div className="bulk-edit--actions">
          { false && <button className="prefill-button" onClick={this.onPrefill}>Prefill</button> }
          <VariationsTabs op={data} onChange={this.onChange} onSelectTab={this.onSelectTab} bulk={true} taxonomyNotSelected={taxonomyNotSelected} />
        </div>
      </div>
    );
  }
}

export default connect()(ControlsInventory);

