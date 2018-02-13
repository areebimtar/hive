import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImageGallery from 'react-image-gallery';
// import classNames from 'classnames';


export default class PhotosCarousel extends Component {
  static propTypes = {
    images: PropTypes.array,
    idx: PropTypes.number,
    onClose: PropTypes.func
  }

  render() {
    const { images, idx, onClose } = this.props;
    const options = {
      items: images,
      autoPlay: false,
      lazyLoad: true,
      showThumbnails: true,
      showNav: true,
      showBullets: true,
      showIndex: true,
      startIndex: idx || 0
    };

    return (
      <div className="photo-carousel">
        <div className="bg" onClick={() => onClose()}/>
        <div className="close-button"onClick={() => onClose()}>Close</div>
        <div className="content">
          <ImageGallery {...options}/>
        </div>
      </div>
    );
  }
}
