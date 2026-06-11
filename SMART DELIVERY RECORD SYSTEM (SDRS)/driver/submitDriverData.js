// driver/submitDriverData.js

function showError(message) {
  const errorMsg = document.getElementById('errorMsg');
  if (errorMsg) {
    const errorSpan = errorMsg.querySelector('span');
    if (errorSpan) errorSpan.textContent = message;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 5000);
  } else {
    console.warn('showError: #errorMsg element not found. Message:', message);
  }
}

function showSuccess() {
  const successMsg = document.getElementById('successMsg');
  if (successMsg) {
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 4000);
  } else {
    console.warn('showSuccess: #successMsg element not found.');
  }
}

function validateForm(date, driverName, invoiceNumber, timeReceived, location) {
  if (!date) {
    showError('Please select a date');
    return false;
  }
  if (!driverName || driverName.trim().length < 2) {
    showError('Driver name must be at least 2 characters');
    return false;
  }
  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    showError('Please enter an invoice number');
    return false;
  }
  if (!timeReceived) {
    showError('Please select a time');
    return false;
  }
  if (!location || location.trim().length < 3) {
    showError('Location must be at least 3 characters');
    return false;
  }
  return true;
}

let currentSubmissionData = null;

function submitDriverData(event) {
  event.preventDefault();
  
  const date = document.getElementById('driverDate').value;
  const driverName = document.getElementById('driverName').value.trim();
  const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
  const timeReceived = document.getElementById('timeReceived').value;
  const location = document.getElementById('location').value.trim();

  // Validate
  if (!validateForm(date, driverName, invoiceNumber, timeReceived, location)) {
    return;
  }

  // Store data temporarily
  currentSubmissionData = { date, driverName, invoiceNumber, timeReceived, location };

  // Populate Confirmation UI (guard DOM nodes)
  const elConfirmDate = document.getElementById('confirmDate'); if (elConfirmDate) elConfirmDate.textContent = date;
  const elConfirmName = document.getElementById('confirmName'); if (elConfirmName) elConfirmName.textContent = driverName;
  const elConfirmInvoice = document.getElementById('confirmInvoice'); if (elConfirmInvoice) elConfirmInvoice.textContent = invoiceNumber;
  const elConfirmTime = document.getElementById('confirmTime'); if (elConfirmTime) elConfirmTime.textContent = timeReceived;
  const elConfirmLocation = document.getElementById('confirmLocation'); if (elConfirmLocation) elConfirmLocation.textContent = location;

  // Toggle UI
  const elDriverForm = document.getElementById('driverForm'); if (elDriverForm) elDriverForm.classList.add('hidden');
  const elConfirmationMode = document.getElementById('confirmationMode'); if (elConfirmationMode) elConfirmationMode.classList.remove('hidden');
  const elFormHeader = document.getElementById('formHeader'); if (elFormHeader) elFormHeader.innerHTML = '<i data-lucide="clipboard-check" style="width:20px;height:20px;color:#0F2341;"></i> Confirm Delivery Info';
  if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', function() {
  const driverDateEl = document.getElementById('driverDate');
  if (driverDateEl) {
    const today = new Date().toISOString().split('T')[0];
    driverDateEl.value = today;
  }

  // Event Listeners for Confirmation UI
  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      document.getElementById('confirmationMode').classList.add('hidden');
      document.getElementById('driverForm').classList.remove('hidden');
      document.getElementById('formHeader').innerHTML = '<i data-lucide="truck" style="width:20px;height:20px;color:#0F2341;"></i> Submit New Delivery';
      if (window.lucide) window.lucide.createIcons();
    });
  }

  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', () => {
      if (!currentSubmissionData) return;

      const btn = confirmSubmitBtn;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px; animation: spin 1s linear infinite;"></i> Processing...';
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        const { date, driverName, invoiceNumber, timeReceived, location } = currentSubmissionData;
        const recordId = typeof generateRecordId === 'function' ? generateRecordId() : 'REC-' + Math.floor(1000 + Math.random() * 9000);

        const newRecord = {
          recordId,
          driver: driverName,
          invoice: invoiceNumber,
          time: timeReceived,
          location,
          date: date,
          status: 'Delivered',
          timestampMs: new Date().getTime() 
        };

        if (window.deliveryRecords) {
            window.deliveryRecords.unshift(newRecord);
            if (typeof saveState === 'function') saveState();
        }
        
        localStorage.setItem('sdrs_last_submission', JSON.stringify(newRecord));

        // Show success message
        showSuccess();

        // Reset UI
        document.getElementById('confirmationMode').classList.add('hidden');
        document.getElementById('driverForm').classList.remove('hidden');
        document.getElementById('driverForm').reset();
        document.getElementById('driverDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('formHeader').innerHTML = '<i data-lucide="truck" style="width:20px;height:20px;color:#0F2341;"></i> Submit New Delivery';
        
        currentSubmissionData = null;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="check-circle-2" style="width:16px;height:16px;"></i> Confirm';
        if (window.lucide) window.lucide.createIcons();

      }, 1200);
    });
  }
});
