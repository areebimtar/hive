
export function getErrorString(error) {
  const errorStrings = [error.toString()];
  if (error.response
    && error.response.text
    && error.response.text.length > 0) {
    try {
      const responseBody = JSON.parse(error.response.text);
      if (responseBody && responseBody.error) {
        errorStrings.push(responseBody.error);
      }
    } catch (e) {
      errorStrings.push('Response body could not be parsed');
    }
  }
  return errorStrings.join('\n');
}

export function getUrlQueryParam(reduction, param) {
  return reduction.getIn(['combined', 'routing', 'locationBeforeTransitions', 'query', param]);
}

export function showToast(message, duration = 4000) {
  window.Materialize.toast(message, duration);
}

export function navigationOnClickHandlerCreator(handler, nextLocation) {
  return (event, ...args) => {
    if (event.ctrlKey) {
      let nextLocationString;
      if (typeof nextLocation === 'string') {
        nextLocationString = nextLocation;
      } else {
        nextLocationString = nextLocation(event, ...args);
      }
      window.open(window.location.origin + nextLocationString, '_blank');
    } else {
      handler(event, ...args);
      event.preventDefault();
    }
  };
}
