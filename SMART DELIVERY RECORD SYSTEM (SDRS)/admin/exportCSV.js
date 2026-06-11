// admin/exportCSV.js

function escapeCSV(str) {
  if (str == null) return '';
  const stringified = String(str);
  if (stringified.search(/("|,|\n)/g) >= 0) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

function exportToCSV() {
  const orders = window.sdrsOrders || [];
  
  if (orders.length === 0) {
    alert("No orders to export.");
    return;
  }
  
  // Headers corresponding to the pipeline data
  const headers = ['XFER ID', 'Date Created', 'Destination', 'Items Summary', 'Driver', 'Driver Action Time', 'Outlet Log', 'Outlet Action Time', 'Global Status'];
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  // Data rows
  orders.forEach(order => {
    const itemsPreview = order.items.map(i => `${i.qty}x ${i.name}`).join('; ');
    const createdTime = order.created_at || (order.created_timestamp ? new Date(order.created_timestamp).toLocaleString() : '--');
    const driverBy = order.driver_check ? order.driver_check.by : '--';
    const driverTime = order.driver_check ? new Date(order.driver_check.time).toLocaleString() : '--';
    const outletLog = order.outlet_check ? order.outlet_check.status : '--';
    const outletTime = order.outlet_check ? new Date(order.outlet_check.time).toLocaleString() : '--';

    const row = [
      order.id,
      createdTime,
      order.outlet,
      itemsPreview,
      driverBy,
      driverTime,
      outletLog,
      outletTime,
      order.status
    ];
    csvRows.push(row.map(escapeCSV).join(','));
  });
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `SDRS_Pipeline_Export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
