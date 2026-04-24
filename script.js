/* ITAM Dashboard — HC IT Pros */

const CSV_PATH = "data/Stock Dashboard - Copy of Data.csv";

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < normalised.length) {
    const c = normalised[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalised[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
      else { field += c; }
    }
    i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows.shift().map(h => h.trim());
  const normalizedRows = rows.filter(r => r.some(cell => (cell ?? '').trim() !== ''));
  return { headers, rows: normalizedRows };
}

// ─── Unified column detection ─────────────────────────────────────────────────
const COL_ALIASES = {
  category: ['Category', 'category', 'Type', 'Group', 'Tab'],
  status:   ['Status', 'status', 'state', 'State', 'STATUS'],
  model:    ['Model', 'model', 'MODEL'],
};
function findColumn(headers, key) {
  for (const name of COL_ALIASES[key]) {
    const idx = headers.indexOf(name);
    if (idx !== -1) return { name, index: idx };
  }
  return { name: null, index: -1 };
}

// ─── State ────────────────────────────────────────────────────────────────────
let _all = { headers: [], rows: [] };
let _filtered = [];
let _sortCol = -1, _sortAsc = true;
let _hiddenCols = new Set();
let _currentTab = 'Assets';
let _categoryIndex = -1;

// ─── Badge helper ─────────────────────────────────────────────────────────────
function makeBadgeClass(val) {
  if (!val) return 'badge';
  const v = String(val).toLowerCase();
  if (['in stock','ok','available','active','ready'].some(x => v.includes(x))) return 'badge ok';
  if (['low','pending','reserved','warning'].some(x => v.includes(x))) return 'badge warn';
  if (['retired','broken','error','lost','missing','damaged'].some(x => v.includes(x))) return 'badge err';
  return 'badge';
}

// ─── Table rendering ──────────────────────────────────────────────────────────
function buildTable(headers, rows) {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const tr = document.createElement('tr');
  headers.forEach((h, idx) => {
    if (_hiddenCols.has(idx)) return;
    const th = document.createElement('th');
    th.style.cursor = 'pointer';
    const label = document.createElement('span');
    label.textContent = h || ('Column ' + (idx + 1));
    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow';
    if (_sortCol === idx) arrow.textContent = _sortAsc ? ' ↑' : ' ↓';
    th.appendChild(label);
    th.appendChild(arrow);
    th.addEventListener('click', () => sortByColumn(idx));
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  const statusIdx = findColumn(headers, 'status').index;
  const frag = document.createDocumentFragment();
  for (const r of rows) {
    const trb = document.createElement('tr');
    headers.forEach((_, i) => {
      if (_hiddenCols.has(i)) return;
      const td = document.createElement('td');
      const val = (r[i] ?? '').trim();
      if (i === statusIdx && val) {
        const badge = document.createElement('span');
        badge.className = makeBadgeClass(val);
        badge.textContent = val;
        td.appendChild(badge);
      } else {
        td.textContent = val;
      }
      trb.appendChild(td);
    });
    frag.appendChild(trb);
  }
  tbody.appendChild(frag);
}

function renderFiltered(rows) {
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('dataTable');
  if (rows.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    table.style.display = '';
    emptyState.style.display = 'none';
    buildTable(_all.headers, rows);
  }
}

function applySearch() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  if (!q) { renderFiltered(_filtered); return; }
  renderFiltered(_filtered.filter(r => r.some(c => (c ?? '').toLowerCase().includes(q))));
}

function sortByColumn(c) {
  if (_sortCol === c) { _sortAsc = !_sortAsc; } else { _sortCol = c; _sortAsc = true; }
  _filtered.sort((a, b) => {
    const A = (a[c] ?? '').toLowerCase(), B = (b[c] ?? '').toLowerCase();
    if (A === B) return 0;
    return _sortAsc ? (A < B ? -1 : 1) : (A > B ? -1 : 1);
  });
  applySearch();
}

// ─── Summary cards ────────────────────────────────────────────────────────────
function buildSummary(headers, rows) {
  const cards = document.getElementById('summaryCards');
  cards.innerHTML = '';
  const statusCol = findColumn(headers, 'status').index;
  const modelCol  = findColumn(headers, 'model').index;

  const byStatus = {};
  if (statusCol !== -1) rows.forEach(r => {
    const k = (r[statusCol] ?? 'Unknown').trim() || 'Unknown';
    byStatus[k] = (byStatus[k] || 0) + 1;
  });

  const models = new Set();
  if (modelCol !== -1) rows.forEach(r => { const m = (r[modelCol] ?? '').trim(); if (m) models.add(m); });

  const makeCard = (title, value, extra = '') => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<h4>${title}</h4><div class="value">${value}</div>${extra}`;
    return div;
  };

  cards.appendChild(makeCard('Total Records', rows.length));
  if (models.size) cards.appendChild(makeCard('Unique Models', models.size));
  if (statusCol !== -1) {
    Object.entries(byStatus).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([k, v]) => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h4>Status</h4><div class="value">${v}</div><span class="${makeBadgeClass(k)}">${k}</span>`;
      cards.appendChild(div);
    });
  }
}

// ─── Tab filtering ────────────────────────────────────────────────────────────
function filterForTab(tabName) {
  if (_categoryIndex === -1) return _all.rows.slice();
  return _all.rows.filter(r =>
    String(r[_categoryIndex] || '').trim().toLowerCase() === tabName.toLowerCase()
  );
}

function renderTab(tabName) {
  _currentTab = tabName;
  document.getElementById('sectionTitle').textContent = tabName;
  document.getElementById('searchInput').value = '';
  _sortCol = -1;
  _filtered = filterForTab(tabName);
  buildSummary(_all.headers, _filtered);
  renderFiltered(_filtered);
}

// ─── Tab row count badges ─────────────────────────────────────────────────────
function updateTabCounts() {
  document.querySelectorAll('.tab, .mobile-tab').forEach(t => {
    const existing = t.querySelector('.tab-count');
    if (existing) existing.remove();
    const count = filterForTab(t.dataset.tab).length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'tab-count';
      badge.textContent = count;
      t.appendChild(badge);
    }
  });
}

// ─── Column toggle ────────────────────────────────────────────────────────────
function buildColToggleList() {
  const list = document.getElementById('colToggleList');
  list.innerHTML = '';
  _all.headers.forEach((h, i) => {
    const label = document.createElement('label');
    label.className = 'col-toggle-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !_hiddenCols.has(i);
    cb.addEventListener('change', () => {
      if (cb.checked) _hiddenCols.delete(i); else _hiddenCols.add(i);
      applySearch();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (h || 'Column ' + (i + 1))));
    list.appendChild(label);
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const rows = q ? _filtered.filter(r => r.some(c => (c ?? '').toLowerCase().includes(q))) : _filtered;
  const visIdx = _all.headers.map((_, i) => i).filter(i => !_hiddenCols.has(i));
  const escape = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [visIdx.map(i => escape(_all.headers[i])).join(',')];
  for (const r of rows) lines.push(visIdx.map(i => escape(r[i] ?? '')).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${_currentTab.toLowerCase()}-export.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').style.display = 'flex';
  document.getElementById('modalConfirm').onclick = () => { if (onConfirm) onConfirm(); closeModal(); };
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────
function openMobileNav() {
  document.getElementById('mobileNav').classList.add('open');
  document.getElementById('mobileNavOverlay').classList.add('open');
}
function closeMobileNav() {
  document.getElementById('mobileNav').classList.remove('open');
  document.getElementById('mobileNavOverlay').classList.remove('open');
}

// ─── Data initialisation (called after CSV loads or file is uploaded) ─────────
function initWithData(csvText) {
  _all = parseCSV(csvText);
  _categoryIndex = findColumn(_all.headers, 'category').index;
  document.getElementById('loadingIndicator').style.display = 'none';
  document.getElementById('mainPanel').style.display = '';
  updateTabCounts();
  renderTab('Assets');
}

// ─── Wire up ALL event listeners (runs immediately on DOMContentLoaded) ───────
function wireListeners() {
  // Desktop tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.mobile-tab').forEach(x =>
        x.classList.toggle('active', x.dataset.tab === t.dataset.tab));
      renderTab(t.dataset.tab);
    });
  });

  // Mobile tabs
  document.querySelectorAll('.mobile-tab').forEach(t => {
    t.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.mobile-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.tab').forEach(x =>
        x.classList.toggle('active', x.dataset.tab === t.dataset.tab));
      renderTab(t.dataset.tab);
      closeMobileNav();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', applySearch);

  // Hamburger
  document.getElementById('hamburgerBtn').addEventListener('click', openMobileNav);
  document.getElementById('mobileNavClose').addEventListener('click', closeMobileNav);
  document.getElementById('mobileNavOverlay').addEventListener('click', closeMobileNav);

  // Actions dropdown
  document.getElementById('btnActions').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('actionsMenu').classList.toggle('open');
  });
  document.addEventListener('click', () =>
    document.getElementById('actionsMenu').classList.remove('open'));

  // Export
  document.getElementById('btnExport').addEventListener('click', () => {
    document.getElementById('actionsMenu').classList.remove('open');
    exportCSV();
  });

  // Column toggle
  document.getElementById('btnToggleCols').addEventListener('click', () => {
    document.getElementById('actionsMenu').classList.remove('open');
    buildColToggleList();
    const panel = document.getElementById('colTogglePanel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('colToggleClose').addEventListener('click', () => {
    document.getElementById('colTogglePanel').style.display = 'none';
  });

  // Add New modal
  document.getElementById('btnAddNew').addEventListener('click', () => {
    const fields = _all.headers.length
      ? _all.headers.map(h => `<div class="form-field"><label>${h}</label><input type="text" placeholder="${h}" /></div>`).join('')
      : '<p>Load data first to see fields.</p>';
    openModal('Add New ' + _currentTab,
      `<div class="form-grid">${fields}</div>`,
      () => alert('UI demo — connect a backend to persist new records.'));
  });

  // Reserve modal
  document.getElementById('btnReserve').addEventListener('click', () => {
    openModal('Reserve Item',
      `<div class="form-grid">
        <div class="form-field"><label>Asset / Item</label><input type="text" placeholder="e.g. ASSET-001" /></div>
        <div class="form-field"><label>Reserved For</label><input type="text" placeholder="Employee name" /></div>
        <div class="form-field"><label>Return Date</label><input type="date" /></div>
      </div>`,
      () => alert('UI demo — connect a backend to persist reservations.'));
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // CSV file upload fallback
  document.getElementById('csvUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => initWithData(ev.target.result);
    reader.readAsText(file);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  wireListeners(); // always wire buttons first — independent of CSV

  fetch(CSV_PATH)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(text => initWithData(text))
    .catch(() => {
      // Show upload fallback instead of just an error
      document.getElementById('loadingIndicator').innerHTML = `
        <div class="load-error">
          <p>⚠ No data file found at <code>${CSV_PATH}</code>.</p>
          <p>Upload your CSV to continue:</p>
          <label class="btn primary upload-label">
            📂 Choose CSV file
            <input type="file" id="csvUpload" accept=".csv" style="display:none" />
          </label>
          <p style="margin-top:12px;font-size:12px;color:#6b7a8a">
            Or add your CSV to <code>/data/</code> and redeploy.
          </p>
        </div>`;
      // Re-wire the upload input since the DOM just changed
      document.getElementById('csvUpload').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => initWithData(ev.target.result);
        reader.readAsText(file);
      });
    });
});
