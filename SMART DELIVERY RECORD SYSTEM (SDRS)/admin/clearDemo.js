// admin/clearDemo.js

function clearDemo() {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

const SDRS_DELETE_STORAGE_KEYS = [
    'warehouseTransfers',
    'driverQueue',
    'driverHistory',
    'outletIncomingQueue',
    'outletHistory',
    'adminGlobalPipeline',
    'complaints',
    'notifications',
    'sdrs_main_orders',
    'sdrs_orders',
    'orders',
    'warehouse_xfer_data',
    'driver_tasks',
    'sdrs_driver_tasks',
    'outlet_incoming',
    'sdrs_records'
];

function clearSDRSLocalStorage() {
    SDRS_DELETE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (window.sdrsState) {
        window.sdrsState.warehouseTransfers = [];
        window.sdrsState.driverQueue = [];
        window.sdrsState.driverHistory = [];
        window.sdrsState.outletIncomingQueue = [];
        window.sdrsState.outletHistory = [];
        window.sdrsState.adminGlobalPipeline = [];
        window.sdrsState.complaints = [];
        window.sdrsState.notifications = [];
    }
}

async function confirmClearDemo() {
    closeDeleteConfirmModal();

    if (window.SDRSSupabase && typeof window.SDRSSupabase.deleteAllDeliveryRecords === 'function') {
        await window.SDRSSupabase.safeCall(
            '[SUPABASE] delete all delivery records',
            () => window.SDRSSupabase.deleteAllDeliveryRecords()
        );
    }

    clearSDRSLocalStorage();

    if (typeof clearAllSDRSData === 'function') {
        clearAllSDRSData();
    }

    clearSDRSLocalStorage();

    if (typeof refreshAdminDashboard === 'function') {
        refreshAdminDashboard();
    }

    if (typeof refreshOpenOrderDetails === 'function') {
        refreshOpenOrderDetails();
    }

    showToast('All SDRS records successfully deleted.', true);

    window.dispatchEvent(new Event('local_state_updated'));
    window.dispatchEvent(new Event('state_sync'));
    window.dispatchEvent(new CustomEvent('sdrs_sync'));
}
