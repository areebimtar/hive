import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

class SearchBar extends Component {
  static propTypes = {
    onQueryChanged: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    query: PropTypes.string,
    placeholder: PropTypes.string.isRequired
  };

  static defaultProps = {
    onClear: _.noop
  };

  onQueryChange = event => {
    const searchQuery = event.target.value;
    this.props.onQueryChanged(searchQuery);
  };

  onSubmitHandler = event => event.preventDefault();

  render() {
    const { query, placeholder, onClear } = this.props;
    return (
      <form onSubmit={this.onSubmitHandler}>
        <div className="input-field">
          <input id="search" type="search"
            required="true"
            placeholder={placeholder}
            onChange={this.onQueryChange}
            value={query}
            autoComplete="off" />
          <label className="label-icon" htmlFor="search">
            <i className="material-icons">search</i>
          </label>
          <i className="material-icons" onClick={onClear}>close</i>
        </div>
      </form>
    );
  }
}

export default SearchBar;
