var URL = require('url');

class UrlCounters {
  constructor() {
    this.counters = {};
  }

  getKey(method, url) {
    var pathname = URL.parse(url).pathname;
    return method + ':' + pathname;
  }

  addUrl(method, url) {
    var key = this.getKey(method, url);
    this.counters[key] = (this.counters[key] || 0) + 1;
  }

  getCount(method, url) {
    var key = this.getKey(method, url);
    return this.counters[key] || 0;
  }
}

module.exports = new UrlCounters();
