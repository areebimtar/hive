import React, { Component } from 'react';
import PropTypes from 'prop-types';
import enhanceWithClickOutside from '../../ClickOutside';
import classNames from 'classnames';


export class SimpleDropdown extends Component {
  static propTypes = {
    options: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    selected: PropTypes.string
  }

  render() {
    const { onChange, options, selected } = this.props;
    const getClasses = (option) => classNames({section: true, selected: option === selected});

    return (
      <div className="bulk-edit-dropdown" onClick={event => event.stopPropagation()}>
        <ul>
          { options.map(option => <li key={option.id} className={getClasses(option.id)} onClick={() => onChange(option.id)}>{option.value}</li>) }
        </ul>
      </div>
    );
  }

  handleClickOutside = () => this.props.onChange()
}

export default enhanceWithClickOutside(SimpleDropdown);
