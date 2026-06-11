// admin/updateRecordsTable.js

function updateRecordsTable() {
    // Sync state locally first from localStorage just in case
    window.deliveryRecords = JSON.parse(localStorage.getItem('sdrs_records')) || window.deliveryRecords || [];

    const tableBody = document.getElementById('recordsTableBody');
    if (!tableBody) return;
    
    if (window.deliveryRecords.length === 0) {
      tableBody.innerHTML = '<tr class="border-b border-navy/5"><td colspan="6" class="px-4 py-8 text-center text-navy/30 text-sm">No records yet. Submit a delivery above to see it here.</td></tr>';
      return;
    }

    tableBody.innerHTML = window.deliveryRecords.map(record => `
      <tr class="border-b border-navy/5 hover:bg-navy/3 transition-colors">
        <td class="px-4 py-3 font-mono text-teal font-semibold text-xs">${record.recordId}</td>
        <td class="px-4 py-3 text-sm">${record.driver}</td>
        <td class="px-4 py-3 font-mono text-xs">${record.invoice}</td>
        <td class="px-4 py-3 text-sm">${record.time}</td>
        <td class="px-4 py-3 text-sm">${record.location}</td>
        <td class="px-4 py-3"><span class="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">${record.status}</span></td>
      </tr>
    `).join('');
}

// Initial paint
document.addEventListener('DOMContentLoaded', () => {
    updateRecordsTable();
});
