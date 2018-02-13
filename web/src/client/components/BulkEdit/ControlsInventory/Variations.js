import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import VariationPair from './VariationPair';

export default class Variations extends Component {
  static propTypes = {
    op: PropTypes.object.isRequired,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    onChange: PropTypes.func
  };

  static defaultProps = {
    readOnly: false,
    onChange: _.noop
  }

  onChange(key, value) {
    const { op, onChange } = this.props;

    onChange(op
      .setIn(['value', key], value)
      .setIn(['value', 'oldValue'], op.get('value')));
  }

  render() {
    const { op, bulk, inline, readOnly } = this.props;
    const variations = op.getIn(['meta', 'variationsData', 'variations']);
    const statusMsg = op.getIn(['meta', 'statuses', 'data', 0, 'data', 'status']);
    const showStatusMsg = (inline || (bulk && !readOnly)) && statusMsg;
    const dummyBulkVariation = bulk && variations.size === 0;

    return dummyBulkVariation ?
      <div className="variation-items-wrapper"><div className="variation-item"><div className="dummy-bulk-property">Choose Category Above</div></div></div> :
      <div className="variation-pair-wrapper">
        { showStatusMsg && <div className="global error">{statusMsg}</div> }
        <VariationPair variations={variations} onChange={this.onChange.bind(this, 'variations')} readOnly={readOnly} bulk={bulk} inline={inline} />
      </div>;
  }
}
