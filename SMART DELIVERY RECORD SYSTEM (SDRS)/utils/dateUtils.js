(function(window){
  'use strict';

  const DateUtils = {
    toIso(timestamp) {
      return new Date(timestamp).toISOString();
    },
    formatShort(timestamp) {
      if (!timestamp) return '--';
      const date = new Date(timestamp);
      return date.toLocaleString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    now() {
      return Date.now();
    }
  };

  window.SDRS = window.SDRS || {};
  window.SDRS.DateUtils = { ...(window.SDRS.DateUtils || {}), ...DateUtils };
})(window);
