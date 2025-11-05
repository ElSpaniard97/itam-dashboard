
/* ITAM Dashboard — HC IT Pros
   Preferences implemented:
   1) Auto-load local CSV inside /data folder
   2) Tabs filter rows where "Category" equals tab
   3) Summary cards show top stats
   4) Accent/color/font aligned with hc-it-pros palette
*/

const CSV_PATH = encodeURI("data/Stock Dashboard - Copy of Data.csv");

/* RFC4180-ish CSV parser that handles quoted fields and commas inside quotes.
   Returns: { headers: string[], rows: string[][] } */
function parseCSV(text){
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while(i < text.length){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; } // escaped quote
        else { inQuotes = false; }
      }else{
        field += c;
      }
    }else{
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ row.push(field); field = ""; }
      else if(c === '\n'){
        row.push(field); rows.push(row); field = ""; row = [];
      }else if(c === '\r'){ /* ignore CR */ }
      else{ field += c; }
    }
    i++;
  }
  // push last
  if(field.length || row.length){ row.push(field); rows.push(row); }
  if(rows.length === 0) return { headers: [], rows: [] };
  const headers = rows.shift().map(h => h.trim());
  const normalizedRows = rows.filter(r => r.some(cell => (cell ?? "").trim() !== ""));
  return { headers, rows: normalizedRows };
}

function detectCategoryColumn(headers){
  const candidates = ["Category","category","Type","Group","Tab"];
  for(const c of candidates){
    const idx = headers.indexOf(c);
    if(idx !== -1) return { name: c, index: idx };
  }
  // fallback: none
  return { name: null, index: -1 };
}

function indexByHeader(headers){
  const map = {};
  headers.forEach((h,i)=>{ map[h]=i; });
  return map;
}

function buildTable(headers, rows){
  const thead = document.getElementById("tableHead");
  const tbody = document.getElementById("tableBody");
  thead.innerHTML = ""; tbody.innerHTML = "";
  const tr = document.createElement("tr");
  headers.forEach((h, idx) => {
    const th = document.createElement("th");
    th.textContent = h || ("Column " + (idx+1));
    th.style.cursor = "pointer";
    th.addEventListener("click", () => sortByColumn(idx));
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  // body
  const frag = document.createDocumentFragment();
  for(const r of rows){
    const trb = document.createElement("tr");
    headers.forEach((_,i)=>{
      const td = document.createElement("td");
      td.textContent = (r[i] ?? "").trim();
      trb.appendChild(td);
    });
    frag.appendChild(trb);
  }
  tbody.appendChild(frag);
}

let _all = { headers:[], rows:[] };
let _filtered = [];
let _sortCol = -1, _sortAsc = true;

function applySearch(){
  const q = document.getElementById("searchInput").value.toLowerCase();
  if(!q){ renderFiltered(_filtered); return; }
  const res = _filtered.filter(r => r.some(c => (c ?? "").toLowerCase().includes(q)));
  renderFiltered(res);
}

function sortByColumn(c){
  if(_sortCol === c){ _sortAsc = !_sortAsc; } else { _sortCol = c; _sortAsc = true; }
  _filtered.sort((a,b)=>{
    const A = (a[c] ?? "").toLowerCase();
    const B = (b[c] ?? "").toLowerCase();
    if(A === B) return 0;
    if(_sortAsc) return A < B ? -1 : 1;
    return A > B ? -1 : 1;
  });
  renderFiltered(_filtered);
}

function renderFiltered(rows){
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();
  for(const r of rows){
    const trb = document.createElement("tr");
    for(let i=0;i<_all.headers.length;i++){
      const td = document.createElement("td");
      td.textContent = (r[i] ?? "").trim();
      trb.appendChild(td);
    }
    frag.appendChild(trb);
  }
  tbody.appendChild(frag);
}

function makeBadgeClass(val){
  if(!val) return "badge";
  const v = String(val).toLowerCase();
  if(["in stock","ok","available","active","ready"].some(x=>v.includes(x))) return "badge ok";
  if(["low","pending","reserved","warning"].some(x=>v.includes(x))) return "badge warn";
  if(["retired","broken","error","lost","missing","damaged"].some(x=>v.includes(x))) return "badge err";
  return "badge";
}

function buildSummary(headers, rows, categoryHeaderIndex){
  const cards = document.getElementById("summaryCards");
  cards.innerHTML = "";
  const hIndex = indexByHeader(headers);

  const total = rows.length;
  const byStatus = {};
  let statusCol = -1;
  ["Status","state","State","STATUS"].forEach(name => {
    if(statusCol === -1 && headers.indexOf(name) !== -1) statusCol = headers.indexOf(name);
  });
  if(statusCol !== -1){
    rows.forEach(r => {
      const k = (r[statusCol] ?? "Unknown").trim() || "Unknown";
      byStatus[k] = (byStatus[k] || 0) + 1;
    });
  }

  const modelCol = headers.indexOf("Model");
  const models = new Set();
  if(modelCol !== -1){
    rows.forEach(r => { const m=(r[modelCol] ?? "").trim(); if(m) models.add(m); });
  }

  const makeCard = (title, value, pillText=null, pillClass="pill") => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h4>${title}</h4><div class="value">${value}</div>` + (pillText ? `<div class="${pillClass}">${pillText}</div>` : "");
    return div;
  };

  cards.appendChild(makeCard("Total", total));
  if(models.size) cards.appendChild(makeCard("Unique Models", models.size));
  if(statusCol !== -1){
    // show up to 2 most common statuses
    const entries = Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).slice(0,2);
    for(const [k,v] of entries){
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `<h4>Status</h4><div class="value">${v}</div><span class="${makeBadgeClass(k)}">${k}</span>`;
      cards.appendChild(div);
    }
  }
  // Category card if applicable
  if(categoryHeaderIndex !== -1){
    cards.appendChild(makeCard("Grouping", "Category", "From CSV headers"));
  }
}

function filterForTab(tabName, headers, rows, categoryColIndex){
  if(categoryColIndex === -1) return rows; // no category column; show all
  return rows.filter(r => String(r[categoryColIndex] || "").trim().toLowerCase() === tabName.toLowerCase());
}

async function loadCSVAndInit(){
  try{
    const res = await fetch(CSV_PATH);
    const text = await res.text();
    const parsed = parseCSV(text);
    _all = parsed;

    const category = detectCategoryColumn(parsed.headers);
    const tabs = document.querySelectorAll(".tab");
    let currentTab = "Assets";

    function renderTab(tabName){
      document.getElementById("sectionTitle").textContent = tabName;
      // rows for tab
      _filtered = filterForTab(tabName, _all.headers, _all.rows, category.index);
      // if nothing matches, show all (graceful fallback)
      if(_filtered.length === 0) _filtered = _all.rows.slice();
      buildTable(_all.headers, _filtered);
      buildSummary(_all.headers, _filtered, category.index);
      applySearch(); // re-apply current search term
    }

    tabs.forEach(t => {
      t.addEventListener("click", e => {
        e.preventDefault();
        tabs.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        currentTab = t.dataset.tab;
        renderTab(currentTab);
      });
    });

    // initial
    renderTab(currentTab);

    // live search
    document.getElementById("searchInput").addEventListener("input", applySearch);
  }catch(err){
    console.error("Failed to load CSV", err);
    alert("Could not load CSV. Make sure this project is served with a local web server so the browser can read /data/*.csv");
  }
}

document.addEventListener("DOMContentLoaded", loadCSVAndInit);
