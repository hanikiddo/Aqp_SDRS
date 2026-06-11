// admin/adminStateListener.js

// This file listens to changes in localStorage so the admin panel updates automatically
window.addEventListener('storage', (event) => {
    if (event.key === 'sdrs_last_submission' && event.newValue) {
        // A new submission was made!
        const newRecord = JSON.parse(event.newValue);
        handleNewSubmissionAnimation(newRecord);
    }
});

function handleNewSubmissionAnimation(record) {
    const timestamp = new Date(record.timestampMs || Date.now());
    const timeString = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Update System Processing section
    const systemTimestamp = document.getElementById('systemTimestamp');
    const recordIdEl = document.getElementById('recordId');
    const validationStatus = document.getElementById('validationStatus');
    const processingStatus = document.getElementById('processingStatus');

    if (systemTimestamp) systemTimestamp.textContent = timeString;
    if (recordIdEl) recordIdEl.textContent = record.recordId;
    if (validationStatus) validationStatus.innerHTML = '<span style="color: #10b981;">✓ Valid</span>';
    if (processingStatus) processingStatus.innerHTML = '<div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div><p style="font-size: 0.875rem; color: #e0e7ff;">Processing...</p>';

    // Update Admin View
    const adminDriver = document.getElementById('adminDriver');
    const adminInvoice = document.getElementById('adminInvoice');
    const adminUpdate = document.getElementById('adminUpdate');

    if (adminDriver) adminDriver.textContent = record.driver;
    if (adminInvoice) adminInvoice.textContent = record.invoice;
    if (adminUpdate) adminUpdate.textContent = timestamp.toLocaleString();

    // After a short fake processing delay, update table
    setTimeout(() => {
        if (processingStatus) {
            processingStatus.innerHTML = '<div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div><p style="font-size: 0.875rem; color: #10b981; font-weight: 500;">✓ Recorded</p>';
        }
        
        // Sync global array and render table
        window.deliveryRecords = JSON.parse(localStorage.getItem('sdrs_records')) || [];
        if (typeof updateRecordsTable === 'function') {
            updateRecordsTable();
        }

        // Remove the local storage trigger flag so it can be retriggered if exactly same string is submitted?
        // Actually storage event fires on any change that differs. Adding timestamp in string ensures diff.
    }, 800);
}
