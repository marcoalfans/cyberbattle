'use strict';

// Data source priority: ?src= → saved gist URL (localStorage) → bundled data.json.
// Point this at your gist's RAW url (the one the GitHub Action keeps updated).
// Same-origin snapshot kept fresh by the GitHub Action — no CORS, served by the
// Pages CDN. (The gist raw URL is cross-origin and GitHub sends no CORS header,
// so fetching it from the browser is blocked — we don't use it as the default.)
const PRIMARY = './battle-55.json';
const FALLBACK = './data.json';   // bundled seed, also same-origin
const LS_KEY = 'cb_src';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let RISKS = [];
const state = { q: '', industry: '', status: '', sort: 'cost-desc', diffs: new Set() };

function sourceUrl() {
  const qp = new URLSearchParams(location.search).get('src');
  return qp || localStorage.getItem(LS_KEY) || PRIMARY;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);   // never hang the UI
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return Array.isArray(json) ? json : (json.risks || []);
  } finally { clearTimeout(t); }
}

function setSrcLabel(text) {
  const el = $('#srcLabel');           // optional element — don't crash if removed
  if (el) el.textContent = 'source: ' + text;
}

async function load() {
  const primary = sourceUrl();
  $('#grid').innerHTML = '<div class="empty">Loading…</div>';
  let used = primary;
  try {
    RISKS = await fetchJson(primary);
  } catch (e) {
    // fall back to the bundled snapshot so the page is never empty
    try { RISKS = await fetchJson(FALLBACK); used = FALLBACK + ' (fallback)'; }
    catch (e2) {
      $('#grid').innerHTML = `<div class="empty">Failed to load data from <code>${esc(primary)}</code><br>${esc(e.message)}<br><br>Use ⚙ Source to set another URL.</div>`;
      RISKS = []; return;
    }
  }
  setSrcLabel(used);
  buildIndustries();
  render();
}

function buildIndustries() {
  const names = [...new Set(RISKS.map(r => r.industryName).filter(Boolean))].sort();
  const sel = $('#industry');
  sel.innerHTML = '<option value="">All industries</option>' +
    names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
}

function statusOf(r) {
  return r.reportState || 'none';
}
const STATUS_LABEL = { none: 'not submitted', in_progress: 'in progress', accepted: 'accepted', rejected: 'rejected' };

function filtered() {
  const q = state.q.trim().toLowerCase();
  let out = RISKS.filter(r => {
    if (state.industry && r.industryName !== state.industry) return false;
    if (state.status && statusOf(r) !== state.status) return false;
    if (state.diffs.size && !state.diffs.has(r.difficulty)) return false;
    if (q) {
      const hay = `${r.name} ${r.description} ${r.technicalDescription} ${r.industryName} ${r.difficulty} ${r.businessRiskId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const s = state.sort;
  out.sort((a, b) => {
    if (s === 'cost-desc') return b.cost - a.cost;
    if (s === 'cost-asc') return a.cost - b.cost;
    if (s === 'name-asc') return a.name.localeCompare(b.name);
    if (s === 'industry') return (a.industryName || '').localeCompare(b.industryName || '') || b.cost - a.cost;
    return 0;
  });
  return out;
}

function highlight(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  try {
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return safe.replace(re, '<mark>$1</mark>');
  } catch { return safe; }
}

function card(r, q) {
  const st = statusOf(r);
  const statusBadge = st === 'none' ? '' : `<span class="badge st-${st}">${STATUS_LABEL[st] || st}</span>`;
  return `
  <article class="card">
    <div class="card-top">
      <div class="card-name">${highlight(r.name, q)}</div>
      <div class="cost">${(r.cost ?? 0).toLocaleString()}</div>
    </div>
    <div class="badges">
      <span class="badge ind">${esc(r.industryName || '—')}</span>
      <span class="badge diff-${esc(r.difficulty)}">${esc(r.difficulty)}</span>
      ${statusBadge}
      <span class="rid">#${r.businessRiskId}</span>
    </div>
    <div class="desc">${highlight(r.description || '', q)}</div>
    <details class="tech">
      <summary>Technical task</summary>
      <div class="tech-body">${highlight(r.technicalDescription || '—', q)}</div>
    </details>
  </article>`;
}

function render() {
  const list = filtered();
  const q = state.q.trim().toLowerCase();
  const grid = $('#grid');
  grid.innerHTML = list.map(r => card(r, q)).join('');
  $('#empty').hidden = list.length > 0;

  // stats
  const total = RISKS.length;
  const sumCost = list.reduce((a, r) => a + (r.cost || 0), 0);
  const inds = new Set(RISKS.map(r => r.industryName)).size;
  $('#stats').innerHTML =
    `<span><b>${list.length}</b> / ${total} risks</span>` +
    `<span><b>${inds}</b> industries</span>` +
    `<span>shown value <b>${sumCost.toLocaleString()}</b></span>`;
  if (RISKS[0]?.battleId != null) $('#battleTag').textContent = '#battle ' + RISKS[0].battleId;

  // expand description on click
  $$('.desc', grid).forEach(d => d.addEventListener('click', () => d.classList.toggle('open')));
}

// ---- wiring ----
$('#search').addEventListener('input', e => { state.q = e.target.value; render(); });
$('#industry').addEventListener('change', e => { state.industry = e.target.value; render(); });
$('#status').addEventListener('change', e => { state.status = e.target.value; render(); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
$$('#diffChips .chip').forEach(c => c.addEventListener('click', () => {
  const d = c.dataset.diff;
  if (state.diffs.has(d)) { state.diffs.delete(d); c.classList.remove('on'); }
  else { state.diffs.add(d); c.classList.add('on'); }
  render();
}));
$('#reloadBtn').addEventListener('click', load);
$('#srcBtn').addEventListener('click', () => {
  const cur = localStorage.getItem(LS_KEY) || '';
  const v = prompt('Gist RAW URL for the battle data (blank = use bundled data.json):', cur);
  if (v === null) return;
  if (v.trim()) localStorage.setItem(LS_KEY, v.trim()); else localStorage.removeItem(LS_KEY);
  load();
});

load();
