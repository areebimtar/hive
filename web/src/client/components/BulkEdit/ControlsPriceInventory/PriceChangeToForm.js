import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';


export class PriceChangeToForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  }

  onChangeValue(event) {
    this.props.onUpdate({ value: event.target.value, type: 'absolute', rounding: this.props.fields.rounding.value });
    this.props.fields.value.onChange(event);
  }

  onChangeRounding(event) {
    this.props.onUpdate({ value: this.props.fields.value.value, type: 'absolute', rounding: event.target.value });
    this.props.fields.rounding.onChange(event);
  }

  onSubmit() {
    this.props.onApply();
    this.props.resetForm();
  }

  render() {
    const { handleSubmit, submitting, invalid, fields: {value, rounding} } = this.props;
    const inactive = value.pristine || submitting || invalid;
    const applyButtonClasses = classNames({apply: true, inactive: inactive});

    return (
      <form onSubmit={handleSubmit(this.onSubmit.bind(this))} >
        <div className="price">
          { !submitting &&
            <div className="price-value">
              <input type="text" placeholder="Price" {...filterInputFieldProps(value)} onChange={this.onChangeValue.bind(this)} />
            </div> }
          { !value.pristine && <div className="error tooltip top">{value.error}</div> }
        </div>
        <span className="price-change-text">Change cents to .</span>
        <div className="cents">
          { !submitting && <input className="price-round" type="text" placeholder="00" {...filterInputFieldProps(rounding)} onChange={this.onChangeRounding.bind(this)} /> }
          { !rounding.pristine && <div className="error tooltip top">{rounding.error}</div> }
        </div>
        { <button className={applyButtonClasses} onClick={handleSubmit(this.onSubmit.bind(this))} disabled={inactive}>Apply</button> }
      </form>
    );
  }
}

export default connect()(
  reduxForm({
    form: 'priceChangeToInput',
    fields: ['value', 'rounding'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(PriceChangeToForm));
