import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import PhotoThumbnail from '../PhotoThumbnail';

const TYPE_ADD = 'add';
const TYPE_REPLACE = 'replace';

const getValue = op => op && op.has('value') && op.get('value').toJS() || [];

export default class ApplyForm extends Component {
  static propTypes = {
    op: PropTypes.object,
    uiData: PropTypes.object,
    onApply: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onPhotoClick: PropTypes.func
  }

  getIndexes() {
    return _.range(this.props.uiData.validators.PHOTOS_LENGTH);
  }

  getThumbnail = (values, showAddArr, onDelete, type) => {
    const { uiData } = this.props;
    const getPhoto = (index) => values[index];
    const indexes = this.getIndexes();
    return (indexes.map(index =>
      <div className="photo" key={index} onClick={(event) => event.stopPropagation()}>
        <PhotoThumbnail idx={index} photo={getPhoto(index)} editEnabled={true} showAdd={showAddArr[index]}
          onAddNew={(photo) => this.setPhoto(photo, index)} onDelete={() => onDelete(index)} onClick={() => this.props.onPhotoClick(index)}
          maxSize={uiData.validators.MAX_SIZE} minSize={uiData.validators.MIN_SIZE}>

          { type === TYPE_ADD && <div className="photo-add"><div>+</div><span>Add</span></div> }
          { type === TYPE_REPLACE && <div className="photo-replace"><div>{index + 1}</div><span>Replace</span></div> }
        </PhotoThumbnail>
      </div>));
  }

  getForm = (op) => {
    const { uiData } = this.props;
    const indexes = this.getIndexes();
    const values = getValue(op);
    const getDelClasses = (index) => classNames({photo: true, delete: !!values[index]});
    let showAddArr;

    switch (op.get('type')) { // eslint-disable-line default-case
      case uiData.BULK_EDIT_OP_CONSTS.PHOTOS_ADD:
        showAddArr = _.map(indexes, index => index === values.length);
        return this.getThumbnail(values, showAddArr, this.removePhoto, TYPE_ADD);
      case uiData.BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE:
        showAddArr = _.map(indexes, () => true);
        return this.getThumbnail(values, showAddArr, this.setPhoto.bind(this, null), TYPE_REPLACE);
      case uiData.BULK_EDIT_OP_CONSTS.PHOTOS_DELETE:
        return (indexes.map(index => <div key={index} className={getDelClasses(index)} onClick={() => this.setPhoto(!values[index], index)}><div className="photo-delete"><div>{index + 1}</div><span>Delete</span></div></div>));
      default:
        throw new Error(`There is no handler for ${op.get('type')}`);
    }
  }

  render() {
    const { op, onApply } = this.props;
    const applyInactive = !getValue(op).length;
    const applyClasses = classNames({apply: true, inactive: applyInactive});

    return (
      <div className="bulk-edit--actionform photos">
        { this.getForm(op) }
        <button className={applyClasses} onClick={onApply} disabled={applyInactive}>Apply</button>
      </div>
    );
  }

  removePhoto = (index) => {
    const newValue = getValue(this.props.op);
    newValue.splice(index, 1);
    this.props.onChange(newValue);
  }

  setPhoto = (photo, index) => {
    const newValue = getValue(this.props.op);
    newValue[index] = photo;
    this.props.onChange(newValue);
  }
}
