(function(window){
  'use strict';

  const Api = {
    baseUrl: '',
    setBaseUrl(url) {
      this.baseUrl = String(url || '').trim();
    },
    async request(path, options = {}) {
      const fullUrl = this.baseUrl ? `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : path;
      const response = await fetch(fullUrl, options);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || `API request failed (${response.status})`);
      }
      return body;
    }
  };

  window.SDRS = window.SDRS || {};
  window.SDRS.Api = { ...(window.SDRS.Api || {}), ...Api };
})(window);
