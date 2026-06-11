import re
import pathlib
base = pathlib.Path('.')
errors = []
files = {
    'warehouse/index.html': base/'warehouse'/'index.html',
    'index.html': base/'index.html',
    'admin/index.html': base/'admin'/'index.html',
    'admin/pipeline-details.html': base/'admin'/'pipeline-details.html',
    'warehouse/order-list.html': base/'warehouse'/'order-list.html'
}
text = files['warehouse/index.html'].read_text('utf-8')
if "status: 'PENDING_DRIVER'" in text:
    errors.append('warehouse/index.html still uses PENDING_DRIVER for new orders')
if "status: 'CREATED'" not in text:
    errors.append('warehouse/index.html missing CREATED status assignment')
text = files['index.html'].read_text('utf-8')
if not re.search(r"\['CREATED', 'PENDING_DRIVER', 'PENDING'\]", text):
    errors.append('index.html driverPending filter missing new status values')
if not re.search(r"\['VERIFIED_BY_DRIVER', 'VERIFIED BY DRIVER'\]", text):
    errors.append('index.html outletPending filter missing both VERIFIED status values')
text = files['admin/index.html'].read_text('utf-8')
if not re.search(r"case 'VERIFIED_BY_DRIVER':\s*case 'VERIFIED BY DRIVER'", text):
    errors.append('admin/index.html badge function missing both VERIFIED cases')
if not re.search(r"\['VERIFIED_BY_DRIVER', 'VERIFIED BY DRIVER'\]", text):
    errors.append('admin/index.html outletPending filter missing both VERIFIED status values')
if not re.search(r"\['CREATED', 'PENDING_DRIVER', 'PENDING'\]", text):
    errors.append('admin/index.html driverPending filter missing pending statuses')
text = files['admin/pipeline-details.html'].read_text('utf-8')
if not re.search(r"case 'PENDING_DRIVER':", text):
    errors.append('pipeline-details.html missing PENDING_DRIVER in status label')
if not re.search(r"\['CREATED', 'PENDING', 'PENDING_DRIVER'\]", text):
    errors.append('pipeline-details.html pending badge filter missing pending statuses')
if not re.search(r"\['VERIFIED_BY_DRIVER', 'VERIFIED BY DRIVER'\]", text):
    errors.append('pipeline-details.html missing both VERIFIED cases')
text = files['warehouse/order-list.html'].read_text('utf-8')
if not re.search(r"status === 'CREATED' \|\| status === 'PENDING' \|\| status === 'PENDING_DRIVER'", text):
    errors.append('warehouse/order-list.html status badge filter missing pending statuses')
print('Validation results:')
if errors:
    for e in errors:
        print('FAIL:', e)
    raise SystemExit(1)
print('PASS: All expected status handling updates are present.')
