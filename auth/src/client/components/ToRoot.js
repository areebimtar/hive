import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../actions';


const navigatoToRoot = (dispatch) => {
  dispatch(Actions.Application.changeRoute('/'));
};

@connect()
export default class ToRoot extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired
  };

  componentDidMount() {
    navigatoToRoot(this.props.dispatch);
  }

  componentDidUpdate() {
    navigatoToRoot(this.props.dispatch);
  }

  render() {
    return (
      <div>
        <p>URL not found</p>
      </div>
    );
  }
}
