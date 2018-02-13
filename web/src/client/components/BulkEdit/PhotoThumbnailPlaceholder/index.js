import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import classNames from 'classnames';

import { ItemTypes } from 'global/modules/etsy/bulkOpsConstants';


const PhotoThumbnailPlaceholderTarget = {
  canDrop(props, monitor) {
    const sourceInfo = monitor.getItem();
    // has target image?
    const targetPhoto = props.children.props.photo || {};
    const targetHasPhoto = targetPhoto.previewUrl || targetPhoto.thumbnail_url;
    // are source and target idxs different
    const sourceIdx = sourceInfo && sourceInfo.idx;
    const targetIdxsAreDifferent = props.idx !== sourceIdx;
    // are source and target on same product row?
    const targetProductId = sourceInfo && sourceInfo.productId;
    const onSameRow = props.productId === targetProductId;
    // can drop?
    return targetHasPhoto && targetIdxsAreDifferent && onSameRow;
  },
  drop(props, monitor) {
    if (_.isFunction(props.onDnD)) {
      // source idx
      const source = monitor.getItem() || {};
      const sourceIdx = source.idx;
      // target idx
      const targetIdx = props.idx;
      // make swap
      props.onDnD(sourceIdx, targetIdx);
    }
  }
};

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  };
}

@DropTarget(ItemTypes.PHOTO_THUMBNAIL, PhotoThumbnailPlaceholderTarget, collect)
export default class PhotoThumbnailPlaceholder extends Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
    idx: PropTypes.number.isRequired,
    productId: PropTypes.string,
    onDnD: PropTypes.func,

    // DnD props
    connectDropTarget: PropTypes.func.isRequired,
    isOver: PropTypes.bool,
    canDrop: PropTypes.bool
  }

  render() {
    const { children, connectDropTarget, isOver, canDrop } = this.props;
    const classes = classNames({photo: true, 'drop-target': isOver && canDrop});

    return connectDropTarget(
      <div className={classes} onClick={(event) => event.stopPropagation()}>
        { children && React.cloneElement(children, { dragOver: isOver }) }
      </div>);
  }
}
