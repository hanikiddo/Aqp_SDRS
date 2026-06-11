(function(window){
  'use strict';

  const STORAGE_KEYS = {
    session: 'sdrs_session',
    orders: 'sdrs_main_orders',
    audit: 'sdrs_audit_log',
    complaints: 'sdrs_complaints',
    meta: 'sdrs_storage_meta'
  };

  const SESSION_TIMEOUT_MINUTES = 45;
  const BACKEND_BASE_URL = '';

  const CREDENTIALS = [
    { username: 'aqpwarehouse', password: 'onlywh00', role: 'admin', displayName: 'Admin User' },
    { username: 'warehouse', password: 'warehouse123', role: 'warehouse', displayName: 'Warehouse User' },
    { username: 'driver', password: 'driver123', role: 'driver', displayName: 'Driver User' },
    { username: 'outlet', password: 'outlet123', role: 'outlet', displayName: 'Outlet User' }
  ];

  function safeParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function createHash(value) {
    const text = String(value || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString();
  }

  function createToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `sdrs-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  function isExpired(timestamp) {
    return !timestamp || Number(timestamp) <= Date.now();
  }

  const StorageService = {
    setItem(key, value) {
      const payload = { value, checksum: createHash(JSON.stringify(value)), updatedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
      return value;
    },
    getItem(key, fallback = null) {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const payload = safeParse(raw, null);
      if (!payload || !payload.hasOwnProperty('value') || !payload.hasOwnProperty('checksum')) {
        return fallback;
      }
      const expected = createHash(JSON.stringify(payload.value));
      if (expected !== payload.checksum) {
        console.warn(`SDRS storage integrity failure for key: ${key}`);
        return fallback;
      }
      return payload.value;
    },
    removeItem(key) {
      localStorage.removeItem(key);
    },
    clearAll() {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    }
  };

  const INVALID_XFER_IDS = new Set(['xfer-1001', 'xfer-1002', 'XFER-1001', 'XFER-1002']);

  function normalizeXferValue(value) {
    return String(value || '').trim().toLowerCase();
  }

  function containsInvalidXfer(value) {
    return INVALID_XFER_IDS.has(normalizeXferValue(value));
  }

  function isInvalidDataEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    return [
      entry.id,
      entry.orderId,
      entry.transferId,
      entry.xfer,
      entry.xferNumber,
      entry.xferNo,
      entry.transfer
    ].some(containsInvalidXfer);
  }

  function purgeInvalidXferData() {
    const keysToClean = [
      STORAGE_KEYS.orders,
      STORAGE_KEYS.complaints,
      'warehouse_xfer_data',
      'driver_tasks',
      'driver_history',
      'outlet_incoming',
      'sdrs_driver_tasks',
      'sdrs_last_order',
      'sdrs_last_completed_order',
      'sdrs_last_submission'
    ];

    keysToClean.forEach((key) => {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) return;

      let value;
      try {
        value = JSON.parse(rawValue);
      } catch (error) {
        return;
      }

      if (Array.isArray(value)) {
        const filtered = value.filter((item) => !isInvalidDataEntry(item));
        if (filtered.length !== value.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
        return;
      }

      if (value && typeof value === 'object') {
        if (isInvalidDataEntry(value)) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  const AuthService = {
    getSession() {
      const session = StorageService.getItem(STORAGE_KEYS.session, null);
      if (!session) return null;
      if (isExpired(session.expiresAt)) {
        this.logout();
        return null;
      }
      return session;
    },
    isAuthenticated() {
      return Boolean(this.getSession());
    },
    login(username, password) {
      const user = CREDENTIALS.find((item) => item.username === username && item.password === password);
      if (!user) return null;
      const expiresAt = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
      const session = {
        token: createToken(),
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        createdAt: Date.now(),
        expiresAt,
        lastActivityAt: Date.now()
      };
      StorageService.setItem(STORAGE_KEYS.session, session);
      return session;
    },
    logout() {
      StorageService.removeItem(STORAGE_KEYS.session);
      window.dispatchEvent(new Event('sdrs_session_ended'));
    },
    requireRole(requiredRole, redirectOnFailure = '../login.html') {
      const session = this.getSession();
      if (!session) {
        window.location.href = redirectOnFailure;
        return false;
      }
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (requiredRole && !roles.includes(session.role)) {
        window.location.href = redirectOnFailure;
        return false;
      }
      this.renew();
      return true;
    },
    renew() {
      const session = this.getSession();
      if (!session) return null;
      session.expiresAt = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
      session.lastActivityAt = Date.now();
      StorageService.setItem(STORAGE_KEYS.session, session);
      return session;
    },
    getRole() {
      const session = this.getSession();
      return session ? session.role : null;
    },
    getProfile() {
      const session = this.getSession();
      return session ? { username: session.username, displayName: session.displayName, role: session.role } : null;
    }
  };

  const ApiService = {
    baseUrl: BACKEND_BASE_URL,
    setBaseUrl(url) {
      this.baseUrl = String(url || '').trim();
    },
    async fetchJson(endpoint, options = {}) {
      const url = this.baseUrl ? `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}` : endpoint;
      const response = await fetch(url, options);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || `API request failed: ${response.status}`);
      }
      return payload;
    },
    async getOrders() {
      if (!this.baseUrl) return StorageService.getItem(STORAGE_KEYS.orders, []);
      const result = await this.fetchJson('/orders');
      return result.data || [];
    },
    async saveOrders(orders) {
      StorageService.setItem(STORAGE_KEYS.orders, orders);
      if (!this.baseUrl) return orders;
      return this.fetchJson('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: orders }) });
    }
  };

  const AuditService = {
    getLogs() {
      return StorageService.getItem(STORAGE_KEYS.audit, []);
    },
    log(action, details = {}) {
      const logs = this.getLogs();
      const entry = {
        id: createToken(),
        action,
        details,
        actor: AuthService.getProfile() || { username: 'system', role: 'system' },
        timestamp: Date.now()
      };
      logs.push(entry);
      StorageService.setItem(STORAGE_KEYS.audit, logs);
      window.dispatchEvent(new CustomEvent('sdrs_audit_log_updated', { detail: entry }));
      return entry;
    }
  };

  const OrderService = {
    STATUSES: ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'VERIFIED', 'COMPLETED'],
    TRANSITIONS: {
      CREATED: ['ASSIGNED'],
      ASSIGNED: ['PICKED_UP'],
      PICKED_UP: ['IN_TRANSIT'],
      IN_TRANSIT: ['ARRIVED'],
      ARRIVED: ['VERIFIED'],
      VERIFIED: ['COMPLETED'],
      COMPLETED: []
    },
    getOrders() {
      return StorageService.getItem(STORAGE_KEYS.orders, []);
    },
    saveOrders(orders) {
      StorageService.setItem(STORAGE_KEYS.orders, orders);
      window.dispatchEvent(new Event('sdrs_orders_updated'));
      return orders;
    },
    findOrder(id) {
      const orders = this.getOrders();
      return orders.find((order) => String(order.id) === String(id)) || null;
    },
    create(orderData) {
      const orders = this.getOrders();
      const order = {
        ...orderData,
        id: orderData.id || createToken(),
        status: 'CREATED',
        history: [],
        timestamps: { createdAt: Date.now() },
        audit: []
      };
      this.addHistory(order, 'CREATED', 'Order created');
      orders.push(order);
      this.saveOrders(orders);
      AuditService.log('ORDER_CREATED', { orderId: order.id, order });
      return order;
    },
    isValidTransition(currentStatus, nextStatus) {
      return Array.isArray(this.TRANSITIONS[currentStatus]) && this.TRANSITIONS[currentStatus].includes(nextStatus);
    },
    addHistory(order, status, note = '') {
      if (!order.history) order.history = [];
      order.history.push({ status, note, actor: AuthService.getProfile(), timestamp: Date.now() });
    },
    transition(orderId, nextStatus, note = '') {
      const order = this.findOrder(orderId);
      if (!order) throw new Error('Order not found');
      if (!this.isValidTransition(order.status, nextStatus)) {
        throw new Error(`Invalid transition from ${order.status} to ${nextStatus}`);
      }
      order.status = nextStatus;
      order.timestamps = { ...order.timestamps, [nextStatus.toLowerCase() + 'At']: Date.now() };
      this.addHistory(order, nextStatus, note);
      this.saveOrders(this.getOrders().map((item) => (item.id === order.id ? order : item)));
      AuditService.log('ORDER_TRANSITION', { orderId: order.id, nextStatus, note });
      return order;
    }
  };

  const SyncService = {
    async syncOrders() {
      const orders = OrderService.getOrders();
      await ApiService.saveOrders(orders);
      window.dispatchEvent(new Event('sdrs_sync_complete'));
      return orders;
    },
    initNetworkListener() {
      window.addEventListener('online', async () => {
        if (!navigator.onLine) return;
        try {
          await this.syncOrders();
          NotificationService.showToast('Online sync completed successfully.');
        } catch (error) {
          console.error('Sync error:', error);
        }
      });
    }
  };

  const NotificationService = {
    showToast(message, type = 'info') {
      const containerId = 'sdrs_toast_container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.style.cssText = `pointer-events:auto;min-width:240px;padding:12px 16px;border-radius:14px;background:${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#111827'};color:#fff;box-shadow:0 16px 40px rgba(15,23,42,0.18);font-size:13px;font-weight:600;opacity:0.95;`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3800);
    }
  };

  window.SDRS = window.SDRS || {};
  window.SDRS.Storage = StorageService;
  window.SDRS.Auth = AuthService;
  window.SDRS.Api = ApiService;
  window.SDRS.Audit = AuditService;
  window.SDRS.Order = OrderService;
  window.SDRS.Sync = SyncService;
  window.SDRS.Notification = NotificationService;
  window.SDRS.CONSTANTS = { STORAGE_KEYS, SESSION_TIMEOUT_MINUTES };

  window.addEventListener('DOMContentLoaded', () => {
    purgeInvalidXferData();
    AuthService.getSession();
    SyncService.initNetworkListener();
  });
})(window);
