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
    'sdrs_xfer_counter'
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
    localStorage.setItem('sdrs_xfer_counter', String(window.xferCounter));
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
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    LEGACY_REMOVE_KEYS.forEach((key) => localStorage.removeItem(key));

    window.sdrsState = buildState();
    window.xferCounter = 1000;
    persistState();

    window.dispatchEvent(new CustomEvent('sdrs_sync'));
    console.log('[SDRS CLEAR] cleared all state');
}

function generateTransferId() {
    const selectedOutletId = String(localStorage.getItem('selectedOutletId') || '').trim();
    if (selectedOutletId) {
        return selectedOutletId;
    }

    const fallbackTransferId = `XFER-${Date.now()}`;
    return fallbackTransferId;
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
window.SDRSStateManager = {
    getState,
    setState,
    appendState,
    removeState,
    updateState,
    clearAllState,
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
