// shared/state.js
const STORAGE_KEYS = {
    warehouseTransfers: 'warehouseTransfers',
    driverQueue: 'driverQueue',
    driverHistory: 'driverHistory',
    outletIncomingQueue: 'outletIncomingQueue',
    outletHistory: 'outletHistory',
    adminGlobalPipeline: 'adminGlobalPipeline',
    complaints: 'complaints',
    notifications: 'notifications'
};

const LEGACY_FALLBACK_KEYS = {
    warehouseTransfers: ['sdrs_main_orders', 'warehouse_xfer_data', 'sdrs_orders', 'orders'],
    driverQueue: ['driver_tasks', 'sdrs_driver_tasks'],
    driverHistory: ['driver_history'],
    outletIncomingQueue: ['outlet_incoming'],
    outletHistory: ['sdrs_outlet_history'],
    adminGlobalPipeline: ['sdrs_records', 'sdrs_main_orders'],
    complaints: ['sdrs_complaints'],
    notifications: ['sdrs_notifications']
};

const LEGACY_REMOVE_KEYS = [
    'sdrs_main_orders',
    'sdrs_orders',
    'orders',
    'warehouse_xfer_data',
    'driver_tasks',
    'driver_history',
    'outlet_incoming',
    'sdrs_driver_tasks',
    'sdrs_complaints',
    'sdrs_records',
    'sdrs_outlet_history',
    'sdrs_last_order',
    'sdrs_last_completed_order',
    'sdrs_last_submission',
    'sdrs_xfer_counter',
    'sdrs_session',
    'sdrs_audit_log',
    'sdrs_storage_meta',
    'sdrs_notifications',
    'sdrs_backup',
    'sdrs_backups'
];

const EXTRA_STORAGE_CLEANUP_KEYS = [
    'selectedOutletId',
    'selectedOutletName',
    'selectedOutletCode',
    'selectedOutlet',
    'selectedOutletData',
    'selectedOutletType',
    'driverCurrentOrder',
    'outletCurrentOrder',
    'adminGlobalPipelineBackup',
    'warehouseTransfersBackup',
    'driverQueueBackup',
    'driverHistoryBackup',
    'outletIncomingQueueBackup',
    'outletHistoryBackup',
    'complaintsBackup',
    'sdrs_demo_mode',
    'sdrs_global_state',
    'sdrs_last_sync',
    'sdrs_last_updated',
    'sdrs_cache',
    'warehouseTransfers_cache',
    'driverQueue_cache',
    'outletIncomingQueue_cache'
];

function parseJson(value, fallback = []) {
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.value)) return parsed.value;
        return fallback;
    } catch (error) {
        return fallback;
    }
}

function normalizeStatus(status) {
    return String(status || '').trim().replace(/\s+/g, '_').toUpperCase();
}

function parseStorageArray(value, fallback = []) {
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.value)) return parsed.value;
        return fallback;
    } catch (error) {
        return fallback;
    }
}

function collectDashboardOrders() {
    const orderMap = new Map();
    const sourceKeys = [
        'warehouseTransfers',
        'driverQueue',
        'driverHistory',
        'outletIncomingQueue',
        'outletHistory',
        'adminGlobalPipeline',
        'sdrs_main_orders',
        'sdrs_records',
        'warehouse_xfer_data',
        'driver_tasks',
        'driver_history',
        'outlet_incoming',
        'sdrs_orders',
        'orders'
    ];

    const addOrder = (item) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item.transferId || item.id || item.orderId || item.outletId || '').trim();
        if (!id) return;
        const normalized = {
            ...item,
            status: normalizeStatus(item.status),
            driverStatus: normalizeStatus(item.driverStatus),
            outletStatus: normalizeStatus(item.outletStatus)
        };

        if (!orderMap.has(id)) {
            orderMap.set(id, normalized);
        } else {
            orderMap.set(id, { ...orderMap.get(id), ...normalized });
        }
    };

    const manager = window.SDRSStateManager;
    if (manager && typeof manager.loadAllStateFromStorage === 'function') {
        const loaded = manager.loadAllStateFromStorage();
        sourceKeys.forEach((key) => {
            const items = Array.isArray(loaded[key]) ? loaded[key] : [];
            items.forEach(addOrder);
        });
    }

    sourceKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (!value) return;
        parseStorageArray(value, []).forEach(addOrder);
    });

    return Array.from(orderMap.values());
}

function calculateDashboardStats(orders = collectDashboardOrders()) {
    const list = Array.isArray(orders) ? orders : collectDashboardOrders();

    const total = list.length;
    const driverPending = list.filter((order) => ['CREATED', 'PENDING_DRIVER', 'PENDING'].includes(normalizeStatus(order.status))).length;
    const outletPending = list.filter((order) => ['VERIFIED_BY_DRIVER', 'VERIFIED BY DRIVER', 'IN_TRANSIT', 'PENDING_OUTLET', 'ARRIVED'].includes(normalizeStatus(order.status))).length;
    const completed = list.filter((order) => normalizeStatus(order.status) === 'COMPLETED').length;
    const issues = list.filter((order) => Boolean(order.hasIssue) || ['REJECTED', 'MISMATCH', 'DISCREPANCY', 'ISSUE'].includes(normalizeStatus(order.status))).length;

    return { total, driverPending, outletPending, completed, issues, orders: list };
}

function loadStateValue(key) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
        return parseJson(raw, []);
    }

    const fallbackKeys = LEGACY_FALLBACK_KEYS[key] || [];
    for (const fallbackKey of fallbackKeys) {
        const fallbackRaw = localStorage.getItem(fallbackKey);
        if (fallbackRaw !== null) {
            const parsed = parseJson(fallbackRaw, []);
            if (parsed.length) {
                return parsed;
            }
        }
    }

    return [];
}

function saveStateValue(key, data) {
    if (!Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
        console.warn('[SDRS STATE] unsupported key:', key);
        return;
    }
    const payload = Array.isArray(data) ? data : [];
    localStorage.setItem(key, JSON.stringify(payload));
}

function buildState() {
    return {
        warehouseTransfers: [],
        driverQueue: [],
        driverHistory: [],
        outletIncomingQueue: [],
        outletHistory: [],
        adminGlobalPipeline: [],
        complaints: [],
        notifications: []
    };
}

function loadAllStateFromStorage() {
    const state = buildState();

    Object.keys(STORAGE_KEYS).forEach((key) => {
        state[key] = loadStateValue(key);
    });

    return state;
}

function persistState() {
    Object.keys(STORAGE_KEYS).forEach((key) => {
        saveStateValue(key, window.sdrsState[key] || []);
    });

    const warehouseTransfers = Array.isArray(window.sdrsState?.warehouseTransfers) ? window.sdrsState.warehouseTransfers : [];
    const driverQueue = Array.isArray(window.sdrsState?.driverQueue) ? window.sdrsState.driverQueue : [];
    const driverHistory = Array.isArray(window.sdrsState?.driverHistory) ? window.sdrsState.driverHistory : [];
    const outletIncomingQueue = Array.isArray(window.sdrsState?.outletIncomingQueue) ? window.sdrsState.outletIncomingQueue : [];
    const outletHistory = Array.isArray(window.sdrsState?.outletHistory) ? window.sdrsState.outletHistory : [];
    const adminGlobalPipeline = Array.isArray(window.sdrsState?.adminGlobalPipeline) ? window.sdrsState.adminGlobalPipeline : [];

    localStorage.setItem('sdrs_main_orders', JSON.stringify(warehouseTransfers));
    localStorage.setItem('sdrs_orders', JSON.stringify(warehouseTransfers));
    localStorage.setItem('orders', JSON.stringify(warehouseTransfers));
    localStorage.setItem('warehouse_xfer_data', JSON.stringify(warehouseTransfers));
    localStorage.setItem('driver_tasks', JSON.stringify(driverQueue));
    localStorage.setItem('driver_history', JSON.stringify(driverHistory));
    localStorage.setItem('outlet_incoming', JSON.stringify(outletIncomingQueue));
    localStorage.setItem('sdrs_outlet_history', JSON.stringify(outletHistory));
    localStorage.setItem('sdrs_records', JSON.stringify(adminGlobalPipeline));
    localStorage.setItem('adminGlobalPipeline', JSON.stringify(adminGlobalPipeline));
    localStorage.setItem('sdrs_xfer_counter', String(window.xferCounter || 1000));
}

function syncAllModules() {
    window.dispatchEvent(new CustomEvent('sdrs_sync'));
    console.log('[SDRS SYNC] triggered');
}

function getState(key) {
    if (!Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
        console.warn('[SDRS STATE] invalid getState key:', key);
        return [];
    }
    if (!Array.isArray(window.sdrsState[key])) {
        window.sdrsState[key] = loadStateValue(key);
    }
    return window.sdrsState[key].map(item => (item && typeof item === 'object') ? { ...item } : item);
}

function setState(key, data) {
    if (!Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
        console.warn('[SDRS STATE] invalid setState key:', key);
        return [];
    }
    const normalized = Array.isArray(data) ? data : [];
    window.sdrsState[key] = normalized.map(item => (item && typeof item === 'object') ? { ...item } : item);
    saveStateValue(key, window.sdrsState[key]);
    persistState();
    syncAllModules();
    console.log('[SDRS SAVE]', key, window.sdrsState[key]);
    return getState(key);
}

function appendState(key, item) {
    if (!item || typeof item !== 'object') {
        return getState(key);
    }
    const list = getState(key);
    const id = String(item.transferId || item.id || item.orderId || '').trim();
    if (!id) {
        list.push({ ...item });
        return setState(key, list);
    }
    const index = list.findIndex((entry) => String(entry.transferId || entry.id || entry.orderId || '').trim() === id);
    if (index === -1) {
        list.push({ ...item });
    } else {
        list[index] = { ...list[index], ...item };
    }
    return setState(key, list);
}

function removeState(key, id) {
    const list = getState(key);
    const normalizedId = String(id || '').trim();
    const filtered = list.filter(
        (item) => String(item.transferId || item.id || item.orderId || '').trim() !== normalizedId
    );
    if (filtered.length !== list.length) {
        console.log('[SDRS REMOVE]', key, id);
        return setState(key, filtered);
    }
    return list;
}

function updateState(key, callback) {
    const current = getState(key);
    const next = callback(Array.isArray(current) ? current : []) || [];
    return setState(key, next);
}

function clearAllState() {
    const explicitKeys = Array.from(new Set([
        ...Object.values(STORAGE_KEYS),
        ...LEGACY_REMOVE_KEYS,
        ...EXTRA_STORAGE_CLEANUP_KEYS
    ].filter(Boolean)));

    const prefixedKeys = Object.keys(localStorage).filter((key) =>
        /^(sdrs_|warehouse|driver|outlet|admin|selected|complaint|backup|transfer)/i.test(key)
    );

    const cleanupKeys = Array.from(new Set([ ...explicitKeys, ...prefixedKeys ]));

    cleanupKeys.forEach((key) => localStorage.removeItem(key));

    window.sdrsState = buildState();
    window.xferCounter = 1000;
    window.globalStats = { total: 0, driverPending: 0, outletPending: 0, completed: 0, issues: 0, timestamp: Date.now() };
    persistState();

    window.dispatchEvent(new CustomEvent('sdrs_sync'));
    window.dispatchEvent(new Event('local_state_updated'));
    window.dispatchEvent(new Event('state_sync'));
    console.log('[SDRS CLEAR] cleared all state');
}

function clearAllSDRSData() {
    clearAllState();
    return true;
}

function generateTransferId() {
    return String(localStorage.getItem('selectedOutletId') || '').trim();
}

function migrateLegacyData() {
    let migrated = false;
    Object.keys(STORAGE_KEYS).forEach((key) => {
        if (!localStorage.getItem(key)) {
            const oldValues = loadStateValue(key);
            if (oldValues.length) {
                window.sdrsState[key] = oldValues;
                saveStateValue(key, oldValues);
                migrated = true;
            }
        }
    });
    if (migrated) {
        LEGACY_REMOVE_KEYS.forEach((key) => localStorage.removeItem(key));
        console.log('[SDRS MIGRATE] legacy data migrated to standardized storage');
    }
}

window.STORAGE_KEYS = STORAGE_KEYS;
window.clearAllSDRSData = clearAllSDRSData;
window.SDRSStats = {
    collectDashboardOrders,
    calculateDashboardStats
};
window.SDRSStateManager = {
    getState,
    setState,
    appendState,
    removeState,
    updateState,
    clearAllState,
    clearAllSDRSData,
    syncAllModules,
    generateTransferId,
    normalizeStatus,
    persistState,
    loadAllStateFromStorage,
    migrateLegacyData
};

window.sdrsState = buildState();
Object.keys(STORAGE_KEYS).forEach((key) => {
    window.sdrsState[key] = loadStateValue(key);
});

window.sdrsState.warehouse_xfer_data = window.sdrsState.warehouseTransfers;
window.sdrsState.driver_tasks = window.sdrsState.driverQueue;
window.sdrsState.driver_history = window.sdrsState.driverHistory;
window.sdrsState.outlet_incoming = window.sdrsState.outletIncomingQueue;

window.sdrsOrders = window.sdrsState.warehouseTransfers;
window.sdrsDriverTasks = window.sdrsState.driverQueue;
window.xferCounter = parseInt(localStorage.getItem('sdrs_xfer_counter'), 10);
if (Number.isNaN(window.xferCounter) || window.xferCounter < 1000) {
    window.xferCounter = 1000;
}

window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (Object.values(STORAGE_KEYS).includes(e.key)) {
        Object.keys(STORAGE_KEYS).forEach((key) => {
            window.sdrsState[key] = loadStateValue(key);
        });
        syncAllModules();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    migrateLegacyData();
    syncAllModules();
});
