import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';
import invariant from 'invariant';
import classNames from 'classnames';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { getPropValue } from 'global/modules/etsy/utils';
import * as components from '../../components';
import * as Actions from '../../actions';

import { getChannelByName } from 'app/client/channels';

const { ProductsPagination, SyncStatus, Table } = components;
const { Menu, CloseButton, SyncButton, CloseModal, EditingCounter, PhotosCarousel } = components.BulkEdit;

const getControlsClass = (control, previewOp) => {
  const classes = ['bulk-edit--controls'];
  if (control.staticClasses) {
    classes.push(control.staticClasses);
  }
  if (control.classes && control.classes[previewOp]) {
    classes.push(control.classes[previewOp]);
  }
  return classes.join(' ');
};

const getComponents = (componentsConfig, selected, previewOp) => {
  const item = componentsConfig[selected] || {};
  invariant(item.controls && components.BulkEdit[item.controls], `Bulk edit controls are not specified for: ${selected}`);

  return {
    Controls: components.BulkEdit[item.controls],
    controlsClasses: getControlsClass(item, previewOp),
    uiData: item.uiData
  };
};

const getPreviewOpType = (data) => data.getIn(['previewOperation', 'type'], '').split('.').shift();

@DragDropContext(HTML5Backend)
class BulkEdit extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape({
      channelName: PropTypes.string.isRequired
    }).isRequired,
    data: PropTypes.object.isRequired,
    products: PropTypes.object,
    showSyncModal: PropTypes.bool
  };

  componentWillMount() {
    const { data, dispatch } = this.props;
    if (!data.has('productIds') || !data.get('productIds').size) {
      dispatch(Actions.Application.changeRoute('/'));
    } else {
      // get products data
      dispatch(Actions.BulkEdit.setFilters({}));
    }
  }

  render() {
    const { data, products, dispatch, showSyncModal, params: { channelName } } = this.props;
    const { componentsConfig, tableConfig, BULK_EDIT_OP_CONSTS } = getChannelByName(channelName).getBulkEditConfig();
    const previewOpType = data.getIn(['previewOperation', 'type'], null);
    const { Controls, controlsClasses, uiData } = getComponents(componentsConfig, data.get('selectedMenuItem'), previewOpType);
    _.set(uiData, 'BULK_EDIT_OP_CONSTS', BULK_EDIT_OP_CONSTS);
    const type = getPreviewOpType(data);
    const photosCarousel = getPropValue(data, 'photosCarousel', null);

    const page = getPropValue(data, 'page');

    const context = { type: data.get('selectedMenuItem'), dispatch, tableScroll: data.get('tableScroll'), inlineEditOp: getPropValue(data, 'inlineEditOp'), page, opType: previewOpType, channelName };
    const sidebarClasses = classNames({ 'bulk-edit-sidebar': true, 'show-sync-modal': showSyncModal });

    const menuItemList = getPropValue(data, 'menuItemList', null);
    return (
      <bulk-edit>

        <div className={sidebarClasses}>
          <Menu items={menuItemList} clickHandler={this.selectMenuItem} />
          <div className="sync-bulk">
            <SyncStatus />
          </div>
        </div>

        <bulk-edit-dashboard>

          <bulk-edit-dashboard--table>

            <bulk-edit-dashboard-op-container>
              <SyncButton onClick={this.sync} show={data.get('pendingUpdates')} inProgress={data.get('pendingUpdatesInProgress') || data.get('uploadingImages')} />
              <div className="bulk-edit--selection">
                <div className="bulk-edit--selected">
                  <EditingCounter count={data.getIn(['selectedProducts', 'selected'])}/>
                </div>
                <app-dashboard--pagination>
                  <ProductsPagination {...page} prev={this.previousProducts} next={this.nextProducts} />
                </app-dashboard--pagination>
              </div>
              <CloseButton onClick={this.closeEdit} />
            </bulk-edit-dashboard-op-container>
            <bulk-edit-dashboard--content>
              <div className={controlsClasses}>
                <Controls data={data.get('previewOperation')} type={type} uiData={uiData}/>
              </div>

              <Table config={tableConfig} data={products} context={context}/>

            </bulk-edit-dashboard--content>
          </bulk-edit-dashboard--table>

        </bulk-edit-dashboard>
        <CloseModal open={data.get('closeModalOpen')} onClose={this.closeModal} />

      { photosCarousel && <PhotosCarousel {...photosCarousel} onClose={this.closeCarousel}/> }
      </bulk-edit>
    );
  }

  selectMenuItem = (item) => this.props.dispatch(Actions.BulkEdit.selectMenuItem(item))
  previousProducts = () => this.props.dispatch(Actions.BulkEdit.previousProducts())
  nextProducts = () => this.props.dispatch(Actions.BulkEdit.nextProducts())
  closeEdit = () => this.props.dispatch(Actions.BulkEdit.closeBulkEdit())
  closeModal = (reason) => this.props.dispatch(Actions.BulkEdit.closeModal(reason))
  sync = () => this.props.dispatch(Actions.BulkEdit.syncPendingChanges(false))

  closeCarousel = () => this.props.dispatch(Actions.BulkEdit.setCarouselData(null))

  handleScrollToRow = (inlineEditOp) => {
    const tableScroll = this.refs.tableScroll;
    if (tableScroll && !_.isEmpty(inlineEditOp) && _.isFinite(inlineEditOp.offset)) {
      setTimeout(() => {
        this.props.dispatch(Actions.BulkEdit.tableScrolled());

        tableScroll.scrollTop = inlineEditOp.offset;
      }, 10);
    }
  }
}

export default connect(state => ({
  data: state.getIn(['edit']),
  showSyncModal: state.getIn(['shopView', 'syncStatusModalOpen']),
  products: state.getIn(['edit', 'productsPreview'])
}))(BulkEdit);
