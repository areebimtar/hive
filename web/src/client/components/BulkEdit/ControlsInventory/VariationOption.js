import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import _ from 'lodash';

import { ItemTypes } from 'global/modules/etsy/bulkOpsConstants';


const VariationOptionSource = {
  beginDrag(props) {
    return {
      id: props.id,
      originalIndex: props.findOption(props.id).index
    };
  },

  endDrag(props, monitor) {
    const { id: droppedId, originalIndex } = monitor.getItem();
    const didDrop = monitor.didDrop();

    if (!didDrop) {
      props.cancelDnD(droppedId, originalIndex);
    } else {
      props.finishDnD();
    }
  }
};

const VariationOptionTarget = {
  canDrop() {
    return false;
  },

  hover(props, monitor) {
    const { id: draggedId } = monitor.getItem();
    const { id: overId } = props;

    if (draggedId !== overId) {
      const { index: overIndex } = props.findOption(overId);
      props.moveOption(draggedId, overIndex);
    }
  }
};

@DropTarget(ItemTypes.OPTION, VariationOptionTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))
@DragSource(ItemTypes.OPTION, VariationOptionSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
}))
class VariationOption extends Component {
  static propTypes = {
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    index: PropTypes.number,
    option: PropTypes.string.isRequired,
    onDelete: PropTypes.func,
    readOnly: PropTypes.bool,
    moveOption: PropTypes.func,
    findOption: PropTypes.func,
    cancelDnD: PropTypes.func,
    finishDnD: PropTypes.func,
    // DnD props
    connectDragSource: PropTypes.func.isRequired,
    connectDragPreview: PropTypes.func.isRequired,
    connectDropTarget: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired
  };

  static defaultProps = {
    readOnly: false,
    bulk: false,
    moveOption: _.noop,
    findOption: _.noop,
    cancelDnD: _.noop,
    finishDnD: _.noop
  };


  onDelete = () => {
    this.props.onDelete(this.props.index);
  }

  render() {
    const { option, readOnly, connectDragSource, connectDragPreview, connectDropTarget, isDragging } = this.props;
    const opacity = isDragging ? 0 : 1;
    const variationItemOption = (<div className="variation-item-option" style={{ opacity }}>
      <div className="name-column">
        {connectDragSource(
          <div className="grab-target">
            <div className="variation-item-option-handle" />
            <div className="variation-item-option-name">{option}</div>
          </div>)}
      </div>
      { readOnly ?
        <div className="delete-column" /> :
        <div className="delete-column option-delete" onClick={this.onDelete} />
      }
    </div>);

    return connectDropTarget(connectDragPreview(variationItemOption));
  }
}

export default VariationOption;
