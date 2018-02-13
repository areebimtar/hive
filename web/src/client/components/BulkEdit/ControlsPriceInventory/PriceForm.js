import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import { ButtonSwitch } from '../../BulkEdit';
import { PRICE_TYPE } from 'global/modules/etsy/bulkOpsConstants';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';

import * as Actions from '../../../actions';

export class PriceForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    values: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  };

  onChangeValue(event) {
    this.props.onUpdate({ value: event.target.value, type: this.props.values.type, rounding: this.props.values.rounding });
    this.props.fields.value.onChange(event);
  }
  onChangeType(newType) {
    this.props.onUpdate({ value: this.props.values.value, type: newType, rounding: this.props.values.rounding });
    this.props.fields.type.onChange(newType);
  }
  onChangeRounding(event) {
    this.props.onUpdate({ value: this.props.values.value, type: this.props.values.type, rounding: event.target.value });
    this.props.fields.rounding.onChange(event);
  }
  onSubmit() {
    this.props.onApply();
    this.customResetForm();
  }

  render() {
    const { handleSubmit, submitting, invalid, fields: {value, type, rounding} } = this.props;
    type.value = type.value || PRICE_TYPE[0].value;
    const inactive = value.pristine || submitting || invalid;
    const applyButtonClasses = classNames({apply: true, inactive: inactive});

    return (
      <form onSubmit={handleSubmit(this.onSubmit.bind(this))} >
        <div className="price-value">
          { !submitting && <input type="text" placeholder="Price" {...filterInputFieldProps(value)} onChange={this.onChangeValue.bind(this)} /> }
          { !submitting && <ButtonSwitch {...type} values={PRICE_TYPE} onChange={this.onChangeType.bind(this)} /> }
          { !value.pristine && <div className="error tooltip top">{value.error}</div> }
        </div>
        <span className="price-change-text">Change cents to .</span>
        <div className="price-round">
          { !submitting && <input type="text" placeholder="00" {...filterInputFieldProps(rounding)} onChange={this.onChangeRounding.bind(this)} /> }
          { !rounding.pristine && <div className="error tooltip top">{rounding.error}</div> }
        </div>
        { <button className={applyButtonClasses} onClick={handleSubmit(this.onSubmit.bind(this))} disabled={inactive}>Apply</button> }
      </form>
    );
  }

  customResetForm() {
    this.props.dispatch(Actions.BulkEdit.resetForm('priceInput'));
  }

}

export default connect()(
  reduxForm({
    form: 'priceInput',
    fields: ['value', 'type', 'rounding'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(PriceForm));
