import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../../actions';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';

import Title from '../Title';
import PhotoThumbnail from '../PhotoThumbnail';
import PhotoThumbnailPlaceholder from '../PhotoThumbnailPlaceholder';
import CannotEdit from '../CannotEdit';
import { CANNOT_EDIT_PHOTOS_MESSAGE } from '../../../constants';

import { getChannelByName } from 'app/client/channels';

const indexes = _.range(BULK_EDIT_VALIDATIONS.PHOTOS_LENGTH);

const getPhoto = (product, index) => {
  const photo = product.getIn(['_formattedPhotos', index]) || product.getIn([FIELDS.PHOTOS, index]);
  return photo ? photo.toJS() : null;
};

const getAddPhotoIndex = (product) => {
  const photos = product.get('_formattedPhotos') || product.get(FIELDS.PHOTOS);
  return photos ? photos.toJS().length : 0;
};

export class ProductRowPhotos extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    context: PropTypes.object
  }

  onApply = () => this.props.dispatch(Actions.BulkEdit.applyInlineEditOp())
  onUpdate = (title) => this.props.dispatch(Actions.BulkEdit.setInlineEditOpValue(title))

  render() {
    const { product, context } = this.props;
    const addPhotoIndex = getAddPhotoIndex(product);
    const productPhotos = product.get(FIELDS.PHOTOS);
    const _formattedPhotosImm = product.get('_formattedPhotos');
    const _formattedPhotos = _formattedPhotosImm ? _formattedPhotosImm.toJS() : [];
    const showMaximumReached = !!_formattedPhotos && _formattedPhotos.length > BULK_EDIT_VALIDATIONS.PHOTOS_LENGTH;
    const editEnebled = !(_formattedPhotos && _formattedPhotos.length);
    const statusData = product.getIn(['_status', 'data']);

    const { componentsConfig } = getChannelByName(context.channelName).getBulkEditConfig();
    const uiData = _.get(componentsConfig, ['photos', 'uiData']);

    const showTooManyPhotos = productPhotos.size > BULK_EDIT_VALIDATIONS.PHOTOS_LENGTH;

    return (
      <div className="content bulk-edit--photos">
        <div className="body">
          <Title product={product} />
          <div className="thumbnails">
            { !showTooManyPhotos && indexes.map(index =>
              <PhotoThumbnailPlaceholder key={index} idx={index} productId={product.get('id')} onDnD={this.swapPhotos}>
                <PhotoThumbnail idx={index} productId={product.get('id')} editEnabled={editEnebled} photo={getPhoto(product, index)}
                  showAdd={index === addPhotoIndex} onAddNew={(photo) => this.addPhoto(photo, index)}
                  onDelete={() => this.removePhoto(index)} onClick={this.showCarousel} placeholder={true}
                  maxSize={uiData.validators.MAX_SIZE} minSize={uiData.validators.MIN_SIZE}>
                  <div className="photo-add"><div>+</div><span>Add</span></div>
                </PhotoThumbnail>
              </PhotoThumbnailPlaceholder>)}
            { !showTooManyPhotos && showMaximumReached && <div className="error tooltip right">Maximum number of photos reached</div> }
            { !showTooManyPhotos && !showMaximumReached && <div className="error tooltip right">{statusData}</div> }
            { showTooManyPhotos && <CannotEdit message={CANNOT_EDIT_PHOTOS_MESSAGE} /> }
          </div>
        </div>
      </div>
    );
  }

  addPhoto = (photo, index) => {
    if (photo && photo.data) {
      // upload image data
      this.props.dispatch(Actions.BulkEdit.uploadImage(photo));
    }

    const product = this.props.product;
    if (product.getIn([FIELDS.PHOTOS, index])) {
      // replace image
      const newValue = new Array(BULK_EDIT_VALIDATIONS.PHOTOS_LENGTH);
      newValue[index] = photo;
      this.props.dispatch(Actions.BulkEdit.setPhotosOp({
        type: BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE,
        products: [product.get('id')],
        value: newValue
      }));
    } else {
      // add new image
      this.props.dispatch(Actions.BulkEdit.setPhotosOp({
        type: BULK_EDIT_OP_CONSTS.PHOTOS_ADD,
        products: [product.get('id')],
        value: [photo]
      }));
    }
  }

  removePhoto = (index) => {
    const product = this.props.product;
    const newValue = _.map(indexes, idx => idx === index);
    this.props.dispatch(Actions.BulkEdit.setPhotosOp({
      type: BULK_EDIT_OP_CONSTS.PHOTOS_DELETE,
      products: [product.get('id')],
      value: newValue
    }));
  }

  swapPhotos = (sourceIdx, targetIdx) => this.props.dispatch(Actions.BulkEdit.setPhotosOp({
    type: BULK_EDIT_OP_CONSTS.PHOTOS_SWAP,
    products: [this.props.product.get('id')],
    value: {sourceIdx, targetIdx}
  }))

  showCarousel = (idx) => {
    const photos = this.props.product.get(FIELDS.PHOTOS);
    const getThumbnailUrl = (photo) => photo.get('previewUrl') || photo.get('thumbnail_url');
    const getFullsizeUrl = (photo) => photo.get('previewUrl') || photo.get('fullsize_url') || photo.get('thumbnail_url');

    if (!photos) { return; }
    const images = photos.map(photo => ({original: getFullsizeUrl(photo), thumbnail: getThumbnailUrl(photo)}));

    this.props.dispatch(Actions.BulkEdit.setCarouselData({images, idx}));
  }
}

export default connect()(ProductRowPhotos);
