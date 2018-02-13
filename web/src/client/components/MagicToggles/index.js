import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import {FilterGroupTitle, FilterRow} from '../../components';
import * as Actions from '../../actions';

export class MagicToggles extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    magicOptions: PropTypes.array
  }

  render() {
    const { dispatch, magicOptions } = this.props;
    return magicOptions.length ? (
      <div className="filter-group magic">
        <FilterGroupTitle type="magic" />
        <ul>
          {magicOptions.map(data => (
            <FilterRow
              key={data.key}
              group="magic"
              filter={data.key}
              name={data.title}
              count={0}
              selected={data.selected}
              clickHandler={() => {
                dispatch(Actions.Application.setBooleanProfileValue({ name: data.key, value: !data.selected }));
              }} />
          ))}
        </ul>
      </div>
    ) : null;
  }
}

export default connect()(MagicToggles);
