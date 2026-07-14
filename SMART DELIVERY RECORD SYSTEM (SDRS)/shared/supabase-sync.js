(function(window) {
  'use strict';

  function getConfig() {
    return window.SDRSSupabaseConfig || {};
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey);
  }

  function getEndpoint(query = '') {
    const config = getConfig();
    return `${config.url.replace(/\/$/, '')}/rest/v1/delivery_records${query}`;
  }

  function getDeliveryRecordsEndpoint() {
    const config = getConfig();
    return `${config.url.replace(/\/$/, '')}/rest/v1/delivery_records`;
  }

  function getHeaders(extra = {}) {
    const config = getConfig();
    return {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra
    };
  }

  function safeParseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function getItems(record) {
    return [
      record.items,
      record.xfers,
      record.xferItems,
      record.selectedItems,
      record.transferItems,
      record.payload
    ].find((items) => Array.isArray(items) && items.length) || [];
  }

  function getTotalBoxes(record) {
    const total = parseInt(record.totalBoxes || record.total_boxes || record.boxes || record.qty || record.quantity || record.total || 0, 10) || 0;
    if (total > 0) return total;
    return getItems(record).reduce((sum, item) => sum + (parseInt(item.totalBoxes || item.total_boxes || item.boxes || item.qty || item.quantity || item.expectedQty || 0, 10) || 0), 0);
  }

  function toDbRecord(record) {
    const items = record.items || record.xferItems || record.xfers || [];
    const { id, status, ...recordWithoutId } = record;
    const destinationType = String(record.destinationType || record.destination_type || '').toUpperCase();
    const destinationId = record.destinationId ||
      record.destination_id ||
      record.destinationOutletId ||
      (destinationType === 'WAREHOUSE' ? 'WAREHOUSE' : '');
    const dbOutletId = record.outlet_id ||
      record.destinationOutletId ||
      (destinationType === 'WAREHOUSE' ? destinationId : '') ||
      record.outletId ||
      record.outlet ||
      '';
    const dbOutletName = record.outlet_name ||
      record.destinationOutletName ||
      (destinationType === 'WAREHOUSE' ? (record.destinationName || 'Warehouse') : '') ||
      record.outletName ||
      record.outlet ||
      '';
    const deliveryStatus = record.delivery_status || record.driver_status || record.driverStatus || record.status || 'PENDING_DRIVER';
    const outletStatus = record.outlet_status || record.outletStatus || '';
    const payload = {
      ...recordWithoutId,
      transferId: record.transferId || record.id || record.orderId,
      transfer_id: record.transfer_id || record.transferId || record.id || record.orderId,
      orderId: record.orderId || record.transferId || record.id,
      status: record.status || deliveryStatus,
      delivery_status: deliveryStatus,
      driver_status: record.driver_status || record.driverStatus || deliveryStatus,
      driverStatus: record.driverStatus || record.driver_status || deliveryStatus,
      outlet_status: outletStatus,
      outletStatus: record.outletStatus || record.outlet_status || outletStatus,
      source_type: record.source_type || record.sourceType || '',
      sourceType: record.sourceType || record.source_type || '',
      destinationType: record.destinationType || record.destination_type || '',
      destination_type: record.destination_type || record.destinationType || '',
      destinationId,
      destination_id: destinationId,
      items,
      xfers: record.xfers || items,
      originalRemarks: record.remarks || ''
    };

    return {
      outlet_id: dbOutletId,
      outlet_name: dbOutletName,
      driver: record.driverName || record.driver || '',
      total_boxes: getTotalBoxes(record),
      delivery_status: deliveryStatus,
      outlet_status: outletStatus,
      remarks: JSON.stringify(payload),
      admin_reply: record.adminReply || record.admin_reply || ''
    };
  }

  function toInsertRecord(record) {
    const payload = toDbRecord(record);
    return {
      outlet_id: payload.outlet_id,
      outlet_name: payload.outlet_name,
      driver: payload.driver,
      total_boxes: payload.total_boxes,
      delivery_status: payload.delivery_status || 'PENDING_DRIVER',
      outlet_status: payload.outlet_status || 'PENDING_OUTLET',
      remarks: payload.remarks,
      admin_reply: payload.admin_reply
    };
  }

  function fromDbRecord(row) {
    const payload = safeParseJson(row.remarks, {});
    const transferId = payload.transferId || payload.orderId || row.outlet_id || '';
    const id = transferId || row.outlet_id || '';
    const items = payload.items || payload.xferItems || payload.xfers || [];
    const preservedRemarks = payload.originalRemarks !== undefined
      ? payload.originalRemarks
      : (payload.remarks !== undefined ? payload.remarks : row.remarks);

    return {
      ...payload,
      id,
      transferId,
      transfer_id: payload.transfer_id || transferId,
      orderId: payload.orderId || transferId,
      outletId: payload.outletId || payload.outlet_id || row.outlet_id || transferId,
      outlet_id: row.outlet_id,
      outletName: payload.outletName || row.outlet_name,
      outlet_name: row.outlet_name,
      sourceType: payload.sourceType || payload.source_type || '',
      source_type: payload.source_type || payload.sourceType || '',
      destinationType: payload.destinationType || payload.destination_type || '',
      destination_type: payload.destination_type || payload.destinationType || '',
      destinationId: payload.destinationId || payload.destination_id || payload.destinationOutletId || row.outlet_id,
      destination_id: payload.destination_id || payload.destinationId || payload.destinationOutletId || row.outlet_id,
      destinationOutletId: payload.destinationOutletId || (String(payload.destinationType || payload.destination_type || '').toUpperCase() === 'OUTLET' ? row.outlet_id : ''),
      destinationOutletName: payload.destinationOutletName || (String(payload.destinationType || payload.destination_type || '').toUpperCase() === 'OUTLET' ? row.outlet_name : ''),
      destinationName: payload.destinationName || row.outlet_name,
      driverName: payload.driverName || row.driver,
      driver_status: payload.driver_status || payload.driverStatus || row.delivery_status,
      driverStatus: payload.driverStatus || payload.driver_status || row.delivery_status,
      totalBoxes: payload.totalBoxes || row.total_boxes,
      status: row.delivery_status || payload.delivery_status || payload.outlet_status || payload.outletStatus,
      delivery_status: row.delivery_status,
      outletStatus: row.outlet_status || payload.outletStatus,
      outlet_status: row.outlet_status,
      adminReply: row.admin_reply || payload.adminReply,
      remarks: preservedRemarks,
      notes: payload.notes || payload.note || '',
      meta: payload.meta || payload,
      items,
      xfers: payload.xfers || items,
      xferItems: payload.xferItems || items,
      createdAt: payload.createdAt || row.created_at,
      dbId: row.id,
      supabaseId: row.id,
      raw: row,
      supabaseRow: row
    };
  }

  async function request(query = '', options = {}) {
    if (!isConfigured()) {
      console.warn('[SUPABASE] missing anon key, using localStorage fallback');
      return null;
    }

    const response = await fetch(getEndpoint(query), {
      ...options,
      headers: getHeaders(options.headers || {})
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(payload?.message || payload?.hint || `Supabase request failed: ${response.status}`);
    }
    return payload;
  }

  async function fetchDeliveryRecords(filters = {}) {
    const params = ['select=*'];
    if (filters.delivery_status) params.push(`delivery_status=eq.${encodeURIComponent(filters.delivery_status)}`);
    if (filters.outlet_status) params.push(`outlet_status=eq.${encodeURIComponent(filters.outlet_status)}`);
    if (filters.outlet_id) params.push(`outlet_id=eq.${encodeURIComponent(filters.outlet_id)}`);
    params.push('order=created_at.desc');
    const rows = await request(`?${params.join('&')}`, { method: 'GET' });
    return Array.isArray(rows) ? rows.map(fromDbRecord) : null;
  }

  async function deleteAllDeliveryRecords() {
    await request('?id=not.is.null', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' }
    });
    return true;
  }

  async function saveDeliveryRecord(record) {
    const transferId = String(record?.transferId || record?.id || record?.orderId || '').trim();
    if (!transferId) return null;
    const response = await fetch(getDeliveryRecordsEndpoint(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toInsertRecord(record))
    });
    const text = await response.text();
    const rows = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(rows?.message || rows?.hint || `Supabase request failed: ${response.status}`);
    }
    return Array.isArray(rows) && rows[0] ? fromDbRecord(rows[0]) : null;
  }

  async function updateDeliveryRecord(recordOrId, patch = {}) {
    const recordObject = typeof recordOrId === 'object' ? recordOrId : {};
    const id = recordObject.supabaseId || recordObject.dbId || patch.supabaseId || patch.dbId || recordObject.id || recordObject.transferId || recordObject.orderId || recordOrId;
    if (!id) return null;
    const baseRecord = typeof recordOrId === 'object' ? recordOrId : { id };
    const payload = toDbRecord({ ...baseRecord, ...patch });
    const numericSupabaseId = /^\d+$/.test(String(id || '')) ? id : '';
    const lookupOutletId = patch.outlet_id || patch.outletId || patch.destinationOutletId || patch.transferId || (!numericSupabaseId ? id : '');
    const query = numericSupabaseId
      ? `?id=eq.${encodeURIComponent(numericSupabaseId)}`
      : `?outlet_id=eq.${encodeURIComponent(lookupOutletId)}`;
    const rows = await request(query, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) && rows[0] ? fromDbRecord(rows[0]) : null;
  }

  async function updateDeliveryRecordByOutletId(outletId, patch = {}) {
    const normalizedOutletId = String(outletId || '').trim();
    if (!normalizedOutletId) return null;
    const payload = toDbRecord({
      ...patch,
      outletId: patch.outletId || normalizedOutletId,
      transferId: patch.transferId || normalizedOutletId,
      outletStatus: patch.outletStatus || patch.outlet_status
    });
    const rows = await request(`?outlet_id=eq.${encodeURIComponent(normalizedOutletId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) && rows[0] ? fromDbRecord(rows[0]) : null;
  }

  async function safeCall(logLabel, callback) {
    if (!isConfigured()) {
      console.warn('[SUPABASE] missing anon key, using localStorage fallback');
      return null;
    }
    try {
      console.log('[SUPABASE] connected');
      const result = await callback();
      if (logLabel) console.log(logLabel);
      return result;
    } catch (error) {
      console.error('[SUPABASE] fallback to localStorage:', error);
      return null;
    }
  }

  window.SDRSSupabase = {
    fetchDeliveryRecords,
    deleteAllDeliveryRecords,
    saveDeliveryRecord,
    updateDeliveryRecord,
    updateDeliveryRecordByOutletId,
    safeCall,
    fromDbRecord,
    toDbRecord,
    toInsertRecord,
    isConfigured
  };
})(window);
