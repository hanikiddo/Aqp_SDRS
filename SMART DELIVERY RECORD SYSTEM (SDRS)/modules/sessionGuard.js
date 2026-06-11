(function(window){
  'use strict';

  const SessionGuard = {
    guard(role, redirect = '../login.html') {
      if (!window.SDRS?.Auth) {
        window.location.href = redirect;
        return false;
      }
      return window.SDRS.Auth.requireRole(role, redirect);
    }
  };

  window.SDRS = window.SDRS || {};
  window.SDRS.Guard = SessionGuard;
})(window);
