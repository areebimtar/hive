import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';


export default class PrevNextRowsButton extends Component {
  static propTypes = {
    context: PropTypes.object,
    onClick: PropTypes.func,
    text: PropTypes.string,
    show: PropTypes.bool,
    classes: PropTypes.string
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.context !== this.props.context ||
      nextProps.text !== this.props.text ||
      nextProps.show !== this.props.show ||
      nextProps.classes !== this.props.classes ||
      nextProps.onClick !== this.props.onClick;
  }

  render() {
    const { text, classes, show, onClick } = this.props;
    const cls = classNames('table-row', classes, {show: show});

    return (
      <div ref="prevNextButton" className={cls} onClick={onClick} dangerouslySetInnerHTML={ {__html: text } } />
    );
  }
}
