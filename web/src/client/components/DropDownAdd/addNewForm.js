import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

class AddNewForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    validate: PropTypes.func,
    value: PropTypes.string,
    onAddItem: PropTypes.func.isRequired,
    placeholder: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  onSubmit(event) {
    this.props.onAddItem(this.state.value);
    if (event) {
      event.preventDefault();
    }
    return false;
  }

  onKeyDown(event) {
    // we need to stop event as dropdown is handling key events as well
    event.stopPropagation();
    // on enter key, we need to submit data
    if (event.keyCode === 13) {
      this.onSubmit();
    }
  }

  onChangeValue(event) {
    this.setState({
      value: event.target.value
    });
  }

  render() {
    const { validate, placeholder } = this.props;
    const { value } = this.state;

    const error = validate ? validate(value) : undefined;
    const inactive = (error ? true : false) || !value;
    const addButtonClasses = classNames({'add-button': true, inactive: inactive});

    return (
      <form onSubmit={this.onSubmit.bind(this)} >
        <div className="add-new">
          <div className="add-new-input" onClick={(event) => event.stopPropagation()}>
            <input type="text" placeholder={placeholder} value={value} onKeyDown={this.onKeyDown.bind(this)} onChange={this.onChangeValue.bind(this)}/>
            { error ? (<div className="error tooltip right">{error}</div>) : undefined }
          </div>
          <button type="submit" className={addButtonClasses} onClick={this.onSubmit.bind(this)} disabled={inactive}>Add</button>
        </div>
      </form>
    );
  }
}

export default connect()(AddNewForm);
