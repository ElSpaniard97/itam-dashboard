/* ITAM Dashboard — HC IT Pros
   Fixes applied:
   1) Robust CSV parser handles \r\n (Windows line endings)
   2) Unified column detection utility
   3) Loading indicator shown until data ready
   4) Empty state shown when tab has no matching rows (no silent fallback)
   5) Sort arrows on column headers
   6) Search input cleared on tab switch (UI stays in sync)
   7) Tab row counts displayed as badges
   8) Export filtered CSV via Actions menu
   9) Column visibility toggles
   10) Reserve / Add New modals
   11) Mobile hamburger nav drawer
*/

const CSV_PATH = "data/Stock Dashboard - Copy of Data.csv";

// ─── CSV Parser ──────────────────────────────────────────────────────────────
// Handles quoted fields, escaped quotes, and both \r\n and \n line endings.
function parseCSV(text) {
  // Normalise Windows line endings before parsing
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < normalised.length) {
    const c = normalised[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalised[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
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
  status:   ['Status', 'Status', 'state', 'State', 'STATUS'],
  model:    ['Model', 'model', 'MODEL'],
};

function findColumn(headers, aliasKey) {
  for (const name of COL_ALIASES[aliasKey]) {
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

// ─── Rendering ────────────────────────────────────────────────────────────────
function buildTable(headers, rows) {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const tr = document.createElement('tr');
  headers.forEach((h, idx) => {
    if (_hiddenCols.has(idx)) return;
    const th = document.createElement('th');
    th.dataset.col = idx;
    const label = document.createElement('span');
    label.textContent = h || ('Column ' + (idx + 1));
    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow';
    if (_sortCol === idx) arrow.textContent = _sortAsc ? ' ↑' : ' ↓';
    th.appendChild(label);
    th.appendChild(arrow);
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => sortByColumn(idx));
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  const frag = document.createDocumentFragment();
  for (const r of rows) {
    const trb = document.createElement('tr');
    headers.forEach((_, i) => {
      if (_hiddenCols.has(i)) return;
      const td = document.createElement('td');
      const val = (r[i] ?? '').trim();
      const statusIdx = findColumn(headers, 'status').index;
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
  const source = _filtered;
  if (!q) { renderFiltered(source); return; }
  const res = source.filter(r => r.some(c => (c ?? '').toLowerCase().includes(q)));
  renderFiltered(res);
}

function sortByColumn(c) {
  if (_sortCol === c) { _sortAsc = !_sortAsc; } else { _sortCol = c; _sortAsc = true; }
  _filtered.sort((a, b) => {
    const A = (a[c] ?? '').toLowerCase();
    const B = (b[c] ?? '').toLowerCase();
    if (A === B) return 0;
    return _sortAsc ? (A < B ? -1 : 1) : (A > B ? -1 : 1);
  });
  applySearch();
}

function makeBadgeClass(val) {
  if (!val) return 'badge';
  const v = String(val).toLowerCase();
  if (['in stock', 'ok', 'available', 'active', 'ready'].some(x => v.includes(x))) return 'badge ok';
  if (['low', 'pending', 'reserved', 'warning'].some(x => v.includes(x))) return 'badge warn';
  if (['retired', 'broken', 'error', 'lost', 'missing', 'damaged'].some(x => v.includes(x))) return 'badge err';
  return 'badge';
}

// ─── Summary cards ────────────────────────────────────────────────────────────
function buildSummary(headers, rows) {
  const cards = document.getElementById('summaryCards');
  cards.innerHTML = '';
  const total = rows.length;
  const statusCol = findColumn(headers, 'status').index;
  const modelCol  = findColumn(headers, 'model').index;

  const byStatus = {};
  if (statusCol !== -1) {
    rows.forEach(r => {
      const k = (r[statusCol] ?? 'Unknown').trim() || 'Unknown';
      byStatus[k] = (byStatus[k] || 0) + 1;
    });
  }

  const models = new Set();
  if (modelCol !== -1) rows.forEach(r => { const m = (r[modelCol] ?? '').trim(); if (m) models.add(m); });

  const makeCard = (title, value, extra = '') => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<h4>${title}</h4><div class="value">${value}</div>${extra}`;
    return div;
  };

  cards.appendChild(makeCard('Total Records', total));
  if (models.size) cards.appendChild(makeCard('Unique Models', models.size));
  if (statusCol !== -1) {
    const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [k, v] of entries) {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h4>Status</h4><div class="value">${v}</div><span class="${makeBadgeClass(k)}">${k}</span>`;
      cards.appendChild(div);
    }
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
  document.getElementById('searchInput').value = ''; // sync search input on tab switch
  _sortCol = -1; // reset sort
  _filtered = filterForTab(tabName);
  buildSummary(_all.headers, _filtered);
  renderFiltered(_filtered);
}

// ─── Tab row count badges ─────────────────────────────────────────────────────
function updateTabCounts() {
  document.querySelectorAll('.tab, .mobile-tab').forEach(t => {
    const tab = t.dataset.tab;
    const count = filterForTab(tab).length;
    // remove existing badge
    const existing = t.querySelector('.tab-count');
    if (existing) existing.remove();
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
      renderFiltered(_filtered);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (h || 'Column ' + (i + 1))));
    list.appendChild(label);
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
  const visibleHeaders = _all.headers.filter((_, i) => !_hiddenCols.has(i));
  const q = document.getElementById('searchInput').value.toLowerCase();
  const rows = q
    ? _filtered.filter(r => r.some(c => (c ?? '').toLowerCase().includes(q)))
    : _filtered;

  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [visibleHeaders.map(escape).join(',')];
  for (const r of rows) {
    const cells = _all.headers
      .filter((_, i) => !_hiddenCols.has(i))
      .map((_, arrIdx) => {
        const origIdx = _all.headers.indexOf(visibleHeaders[arrIdx]);
        return escape(r[origIdx] ?? '');
      });
    lines.push(cells.join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${_currentTab.toLowerCase()}-export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').style.display = 'flex';
  document.getElementById('modalConfirm').onclick = () => { onConfirm && onConfirm(); closeModal(); };
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

// ─── Init ─────────────────────────────────────────────────────────────────────
async function loadCSVAndInit() {
  try {
    const res = await fetch(CSV_PATH);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    _all = parseCSV(text);
    _categoryIndex = findColumn(_all.headers, 'category').index;

    // Hide loader, show panel
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('mainPanel').style.display = '';

    updateTabCounts();

    // Desktop tab clicks
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        // sync mobile
        document.querySelectorAll('.mobile-tab').forEach(x => {
          x.classList.toggle('active', x.dataset.tab === t.dataset.tab);
        });
        renderTab(t.dataset.tab);
      });
    });

    // Mobile tab clicks
    document.querySelectorAll('.mobile-tab').forEach(t => {
      t.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.mobile-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        // sync desktop
        document.querySelectorAll('.tab').forEach(x => {
          x.classList.toggle('active', x.dataset.tab === t.dataset.tab);
        });
        renderTab(t.dataset.tab);
        closeMobileNav();
      });
    });

    renderTab('Assets');

    // Search
    document.getElementById('searchInput').addEventListener('input', applySearch);

    // Hamburger
    document.getElementById('hamburgerBtn').addEventListener('click', openMobileNav);
    document.getElementById('mobileNavClose').addEventListener('click', closeMobileNav);
    document.getElementById('mobileNavOverlay').addEventListener('click', closeMobileNav);

    // Actions dropdown toggle
    document.getElementById('btnActions').addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('actionsMenu').classList.toggle('open');
    });
    document.addEventListener('click', () => document.getElementById('actionsMenu').classList.remove('open'));

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

    // Modal buttons
    document.getElementById('btnAddNew').addEventListener('click', () => {
      const fields = _all.headers.map(h =>
        `<div class="form-field"><label>${h}</label><input type="text" placeholder="${h}" /></div>`
      ).join('');
      openModal('Add New ' + _currentTab, `<div class="form-grid">${fields}</div>`,
        () => alert('This is a UI demo — connect a backend to save new records.'));
    });

    document.getElementById('btnReserve').addEventListener('click', () => {
      openModal('Reserve Item',
        `<p>Select an asset tag or employee to create a reservation.</p>
         <div class="form-field"><label>Asset / Item</label><input type="text" placeholder="e.g. ASSET-001" /></div>
         <div class="form-field"><label>Reserved For</label><input type="text" placeholder="Employee name" /></div>
         <div class="form-field"><label>Return Date</label><input type="date" /></div>`,
        () => alert('This is a UI demo — connect a backend to save reservations.')
      );
    });

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

  } catch (err) {
    console.error('Failed to load CSV', err);
    document.getElementById('loadingIndicator').innerHTML =
      '<p class="load-error">⚠ Could not load data. Serve this project with a local web server:<br><code>python3 -m http.server</code></p>';
  }
}

document.addEventListener('DOMContentLoaded', loadCSVAndInit);
