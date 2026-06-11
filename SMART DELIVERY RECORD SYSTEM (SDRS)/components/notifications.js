(function(window){
  'use strict';

  function showToast(message, type = 'info') {
    const containerId = 'sdrs_toast_container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `pointer-events:auto;min-width:240px;padding:14px 18px;border-radius:16px;background:${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#111827'};color:#fff;font-size:13px;font-weight:600;box-shadow:0 18px 40px rgba(15,23,42,0.18);`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  window.SDRS = window.SDRS || {};
  window.SDRS.UI = window.SDRS.UI || {};
  window.SDRS.UI.showToast = showToast;
})(window);
