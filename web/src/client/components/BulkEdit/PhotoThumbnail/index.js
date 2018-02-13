import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import _ from 'lodash';
import { DragSource } from 'react-dnd';
import classNames from 'classnames';
import CryptoJS from 'crypto-js';

import { ItemTypes } from 'global/modules/etsy/bulkOpsConstants';

const ERROR_MESSAGE_FADE_TIME = 5000; // show error messages for 5 seconds before hiding;

const PhotoThumbnailSource = {
  canDrag(props) {
    const photo = props.photo;
    const thumbnailUrl = _.get(photo, 'thumbnail_url', '');
    // can be dragged only if it has photo and edit is enabled (eg. there is no bulk op preview applied)
    return props.editEnabled && thumbnailUrl;
  },
  beginDrag(props) {
    // pass some necessary info to drop target
    return {
      idx: props.idx,
      productId: props.productId
    };
  }
};

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

@DragSource(ItemTypes.PHOTO_THUMBNAIL, PhotoThumbnailSource, collect)
export default class PhotoThumbnail extends Component {
  static propTypes = {
    photo: PropTypes.object,
    showAdd: PropTypes.bool,
    editEnabled: PropTypes.bool,
    onAddNew: PropTypes.func,
    onDelete: PropTypes.func,
    onClick: PropTypes.func,
    idx: PropTypes.number,
    productId: PropTypes.string,
    children: PropTypes.any,
    placeholder: PropTypes.bool,
    maxSize: PropTypes.number,
    minSize: PropTypes.number,

    // DnD props
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    dragOver: PropTypes.bool
  }

  constructor(props) {
    super(props);
    this.state = {
      errorMessage: ''
    };
  }

  onDrop = (files) => {
    const { maxSize, minSize } = this.props;
    const errorMessages = {
      tooBig: `Height and width must each be at most ${maxSize}px`,
      tooSmall: `Height and width must each be at least ${minSize}px`
    };

    if (_.isArray(files) && files.length === 1) {
      const file = files[0];

      // create image element
      const imgElem = document.createElement('img');
      imgElem.onload = () => {
        // check size constraints before loding it into buffer
        if (imgElem.width > maxSize || imgElem.height > maxSize) {
          this.setError(errorMessages.tooBig);
          return;
        } else if (imgElem.width < minSize || imgElem.height < minSize) {
          this.setError(errorMessages.tooSmall);
          return;
        }

        // load image into buffer
        const reader = new FileReader();

        reader.onload = (readerEvt) => {
          // and add it to bulk op
          const data = readerEvt.target.result;
          const wordArray = CryptoJS.lib.WordArray.create(data);
          const hash = CryptoJS.SHA1(wordArray).toString();
          this.props.onAddNew({thumbnail_url: file.preview, mime: file.type, data, hash});
        };

        reader.readAsArrayBuffer(file);
      };
      imgElem.src = file.preview;
    }
  }

  render() {
    const { photo, showAdd, onDelete, onClick, idx, editEnabled, placeholder, isDragging, dragOver, connectDragSource, children } = this.props;
    const thumbnailUrl = _.get(photo, 'thumbnail_url', '');
    const connect = connectDragSource;
    const classes = classNames({image: true, dragging: isDragging});

    const showDropzone = !dragOver && !isDragging && editEnabled && (thumbnailUrl || showAdd);
    const showDropzoneAddPhoto = !thumbnailUrl && showAdd;
    const showDropzonePhotoUpdated = thumbnailUrl && photo.updated;

    const showThumbnail = !dragOver && !isDragging && !editEnabled && thumbnailUrl;
    const showThumbnailUpdate = showThumbnail && photo.updated;
    const updateProps = {updated: true};
    if (photo && photo.op) { updateProps[photo.op] = true; }
    const updateClasses = classNames(updateProps);

    const showThumbnailOnDragHover = (dragOver || isDragging) && thumbnailUrl;

    const showPlaceholder = !showDropzone && !showThumbnail && placeholder;
    const errorMessage = this.state.errorMessage;
    const errorclasses = classNames('error-bubble-right', 'photo-thumbnail-transient-error', { 'no-error': !errorMessage });

    return (connect(
      <div className={classes}>
        { showDropzone && <Dropzone onDrop={this.onDrop} multiple={false} className="dropzone" activeClassName="activeDropzone" disableClick={!!thumbnailUrl}>
          { showDropzoneAddPhoto &&  children}
          { showDropzonePhotoUpdated && <div className="updated">updated</div> }
          { thumbnailUrl && <div className="photo-container"><img src={thumbnailUrl} /></div> }
          { thumbnailUrl && <div className="delete-button" onClick={(event) => !event.stopPropagation() && onDelete()} /> }
          { thumbnailUrl && <div className="preview-button" onClick={(event) => !event.stopPropagation() && onClick(idx)} /> }
        </Dropzone> }

        { showThumbnailUpdate && <div className={updateClasses}>updated</div> }
        { showThumbnail && <div className="photo-container"><img src={thumbnailUrl} /></div> }

        { showThumbnailOnDragHover && <div className="photo-container"><img src={thumbnailUrl} /></div> }

        { showPlaceholder && <div className="placeholder">{idx + 1}</div>}
        <div className={errorclasses}>{errorMessage || '-'}</div>
      </div>));
  }


  setError(message) {
    this.setState({ errorMessage: message });
    setTimeout(() => this.setState({ errorMessage: '' }), ERROR_MESSAGE_FADE_TIME);
  }
}
