import _ from 'lodash';
import mixpanelBrowser from 'mixpanel-browser';

// if we're not going to track to mixpanel, use this dummy which does nothing.
// For development on mixpanel work without using the localhost token, set dummy = console.log.
const dummy = () => {};

const MIXPANEL_ID_PREFIX = 'vela-id-';

// start by setting up a dummy mixpanel client. If we get a token from our server, we'll configure an actual mixpanel instance.
let mixpanelClient = {
  init: () => dummy('MIX initializing'),
  identify: (id) => dummy(`MIX identify ${id}`),
  track: (name, payload) => dummy(`MIX track event ${name}`, payload),
  register: (payload) => dummy('MIX register superproperties', payload),
  people: {
    set: (payload) => dummy('MIX set profile info', payload)
  }
};

export const initialize = (configData) => {
  if (_.get(configData, 'mixpanelToken')) {
    mixpanelBrowser.init(configData.mixpanelToken);
    mixpanelClient = mixpanelBrowser;
  }
};

export const updateUserInfo = (data) => {
  const userId = data.userId || data.user_id;
  if (!userId) {
    return;
  }
  mixpanelClient.identify(MIXPANEL_ID_PREFIX + userId);
  const fullName = (data.firstName || data.lastName) ? `${data.firstName} ${data.lastName}` : null;
  const userInfo = {
    $email: data.email,
    $firstName: data.firstName,
    $lastName: data.lastName,
    $name: fullName,
    velaId: userId,
    loginCount: data.loginCount
  };
  _.forEach(userInfo, (value, key) => {
    if (value === null || value === undefined) {
      delete userInfo[key];
    }
  });
  mixpanelClient.people.set(userInfo);
};

export const trackEvent = (eventName, payload) => {
  mixpanelClient.track(eventName, payload || undefined);
};

export const setContext = (data) => {
  // register doesn't call mixpanel, it just says that the next events that are tracked should have these properties on them
  // until these values are changed. So, when we track edits or syncs we'll be able to see what shop and state they were for
  mixpanelClient.register(data);
};
