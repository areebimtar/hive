import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Images from '../../img';

export const ARROW_TYPES = {
  TOP_LEFT: 'top left',
  TOP_RIGHT: 'top right',
  BOTTOM_LEFT: 'bottom left',
  BOTTOM_RIGHT: 'bottom right'
};

export default class Popover extends Component {
  static propTypes = {
    icon: PropTypes.string,
    arrowType: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string,
    paragraphs: PropTypes.array
  };

  static defaultProps = {
    icon: Images.helpButtonInverted,
    arrowType: 'TOP_LEFT'
  };

  render() {
    const { image, title, icon, paragraphs = [], arrowType } = this.props;
    const popoverClasses = classNames( 'popover', ARROW_TYPES[arrowType] || ARROW_TYPES.TOP_LEFT );
    return (
      <div className="popover-widget">
        <div className="popover-icon"><img src={icon} /></div>
        <div className={popoverClasses}>
          {image && <img className="popover-image" src={image} />}
          {title && <div className="popover-title">{title}</div>}
          {paragraphs && paragraphs.map((text, idx) => <div key={idx} className="popover-paragraph" dangerouslySetInnerHTML={{__html: text}} /> )}
        </div>
      </div>
    );
  }
}
