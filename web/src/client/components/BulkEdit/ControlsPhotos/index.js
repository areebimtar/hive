import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';
import classNames from 'classnames';

import * as Actions from '../../../actions';

import ApplyForm from './ApplyForm';


export class ControlsPhotos extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object,
    type: PropTypes.string,
    uiData: PropTypes.object
  }

  render() {
    const { data, type, uiData } = this.props;
    const opType = data.get('type');
    const classes = classNames({[type]: false, 'bulk-edit--actions': true, 'bulk-edit--actions-photos': true});

    return (
      <div className={classes}>
        <div className="bulk-edit--actionselector">
          <DropdownList data={uiData.options}
                        valueField="type" textField="text"
                        defaultValue={opType || 'Choose Action'}
                        value={opType}
                        onChange={this.setOperation} />
        </div>
        <ApplyForm op={data} onApply={this.applyOp} onChange={this.setValue} onPhotoClick={this.showCarousel} uiData={uiData}/>
      </div>
    );
  }

  setValue = (value) => {
    const newValue = _.map(value, photo => {
      if (photo && photo.data) {
        // upload image data
        this.props.dispatch(Actions.BulkEdit.uploadImage(photo));
      }
      return photo;
    });

    this.props.dispatch(Actions.BulkEdit.setValue(newValue));
  }
  setOperation = (operation) => this.props.dispatch(Actions.BulkEdit.setOperation(operation.type))
  applyOp = () => this.props.dispatch(Actions.BulkEdit.applyPreviewOp())

  showCarousel = (idx) => {
    const value = this.props.data.get('value');
    const images = _.map(value, photo => ({original: photo.previewUrl, thumbnail: photo.previewUrl}));

    this.props.dispatch(Actions.BulkEdit.setCarouselData({images, idx}));
  }
}

export default connect()(ControlsPhotos);
