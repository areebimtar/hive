import _ from 'lodash';
import React, { Component }  from 'react';
import PropTypes from 'prop-types';
import { SHOP_SYNC_STATUS_DUPLICATE, SHOP_SYNC_TOO_MANY_LISTINGS, SHOP_SYNC_IN_VACATION_MODE } from 'global/db/models/constants';

const invalidCodes = [{
  code: SHOP_SYNC_STATUS_DUPLICATE,
  title: 'Duplicate Shop',
  messageLines: [
    'It looks like this shop has already been added to Vela using a different email address. To view your listings you can sign in with that account.',
    'If you’d like to add a different shop you can do so by simply clicking the shop selection dropdown (top left hand corner) and selecting “Add Shop”.'
  ]
}, {
  code: SHOP_SYNC_TOO_MANY_LISTINGS,
  title: 'Too Many Listings',
  messageLines: [
    'It appears that your shop has over 10,000 listings which at this time exceeds the number of listings we can support for a single shop. We intend to be able to support larger shops in the future, but for the time being, you would need to delete a portion of your listings in order to use Vela.',
    'If you have another shop with fewer listings you are welcome to add it by simply clicking the shop selection dropdown (top left hand corner of your screen) and selecting “Add Shop”.'
  ]
}, {
  code: SHOP_SYNC_IN_VACATION_MODE,
  title: 'Vacation Mode',
  messageLines: [
    'It appears that your shop is in or was was recently brought out of “Vacation Mode”. When a shop is in “Vacation Mode”, ${channelName} takes it offline, which prevents Vela (or any apps) from being able to connect to it',
    'Once you bring it back online, there is typically a 4 hour delay between the listings appearing on ${channelName} and then being reflected in Vela, but at that point everything should match up and you\'ll be free to edit.'
  ]
}];

function resolveChannelString(text, newString) {
  return text && text.replace(/\$\{channelName\}/g, newString);
}

const buildContent = (invalidCode, serverErrorMessage, channelName) => {
  let result = _.find(invalidCodes, {code: invalidCode });
  if (!result) {
    result = {
      title: 'Can\'t sync this shop with ${channelName}',
      messageLines: ['We\'re having trouble trying to sync this shop with ${channelName}. Here is the error we\'ve received:', serverErrorMessage]
    };
  }
  return {
    title: resolveChannelString(result.title, channelName),
    messageLines: _.map(result.messageLines, line => resolveChannelString(line, channelName))
  };
};

class InvalidShop extends Component {
  static propTypes = {
    invalidCode: PropTypes.string,
    serverErrorMessage: PropTypes.string,
    channelName: PropTypes.string.isRequired
  }

  render() {
    const {invalidCode, serverErrorMessage, channelName} = this.props;
    const { title, messageLines } = buildContent(invalidCode, serverErrorMessage, channelName);

    return (
      <div className="app-dashboard-container">
        <div className="app-dashboard-table">
          <div className="invalid-shop">
            <div className="invalid-contents">
              <div className="gear-image" />
              <div className="title">{title}</div>
              { messageLines.map((line, i) => <div key={i} className="message-line">{line}</div>)}
              <div className="message-line">Hopefully this provides a little clarity, but if you have any questions, please feel free to reach out by clicking the blue chat icon (bottom right hand corner) or via email at <a href="mailto:contact@getvela.com">contact@getvela.com</a></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default InvalidShop;
