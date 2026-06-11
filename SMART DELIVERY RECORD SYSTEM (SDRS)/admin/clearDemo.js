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

function confirmClearDemo() {
    closeDeleteConfirmModal();

    if (typeof clearAllSDRSData === 'function') {
        clearAllSDRSData();
    }

    if (typeof refreshAdminDashboard === 'function') {
        refreshAdminDashboard();
    }

    if (typeof refreshOpenOrderDetails === 'function') {
        refreshOpenOrderDetails();
    }

    showToast('All SDRS records successfully deleted.', true);

    window.dispatchEvent(new Event('local_state_updated'));
    window.dispatchEvent(new Event('state_sync'));
}
