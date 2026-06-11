// admin/generateRecordId.js

function generateRecordId() {
  window.recordCounter++;
  return `REC-${window.recordCounter}`;
}
