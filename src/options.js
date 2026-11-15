import { getState, setState, CATALOG } from './core/store.js';
import { parseList, normalizeHost } from './core/list.js';
import { t, send, localize } from './ui.js';

localize();
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const listName = (id, info) => (info.custom ? info.url : t('list_' + id.replace(/-/g, '_')));

async function renderLists() {
  const { lists } = await getState();
  const box = $('lists');
  box.replaceChildren();
  for (const [id, info] of Object.entries(lists)) {
    const cat = CATALOG.find((c) => c.id === id);
    const row = el('div', 'list');
    const sw = el('input', 'switch'); sw.type = 'checkbox'; sw.checked = !!info.on; sw.id = `on-${id}`;
    sw.addEventListener('change', async () => { status.textContent = t('optUpdating'); await send({ type: 'toggleList', id, on: sw.checked }); renderLists(); });
    const name = el('label', null, listName(id, info)); name.htmlFor = sw.id; name.style.fontWeight = '600'; name.style.overflowWrap = 'anywhere';
    const actions = el('div', 'row');
    const upd = el('button', 'btn', t('optUpdate')); upd.type = 'button';
    upd.addEventListener('click', async () => { upd.disabled = true; status.textContent = t('optUpdating'); await send({ type: 'refresh', id }); renderLists(); });
    actions.append(upd);
    if (info.custom) {
      const rm = el('button', 'btn', t('optRemove')); rm.type = 'button';
      rm.addEventListener('click', async () => { await send({ type: 'removeList', id }); renderLists(); });
      actions.append(rm);
    }
    const meta = el('div', 'meta muted');
    const when = info.updated ? new Date(info.updated).toLocaleDateString() : t(cat?.bundled ? 'optNever' : 'optNotLoaded');
    meta.append(`${(info.count || 0).toLocaleString()} ${t('optRules')} · ${t('optUpdated')}: ${when}`);
    const home = cat?.home || (info.custom ? info.url : null);
    if (home) { const a = el('a', null, t('optSource')); a.href = home; a.target = '_blank'; a.rel = 'noopener noreferrer'; meta.append(' · ', a); }
    const status = el('div', 'meta muted');
    if (info.error) { status.className = 'meta err'; status.textContent = `${t('optError')}: ${info.error}`; }
    row.append(sw, name, actions, meta, status);
    box.append(row);
  }
}

const toLines = (arr) => arr.join('\n');
const fromLines = (text) => parseList(text).block;

async function renderMine() {
  const s = await getState();
  $('userBlock').value = toLines(s.userBlock);
  $('userAllow').value = toLines(s.userAllow);
}

$('save').addEventListener('click', async () => {
  await setState({ userBlock: fromLines($('userBlock').value), userAllow: fromLines($('userAllow').value) });
  await renderMine();
  $('saved').textContent = t('optSaved');
  setTimeout(() => { $('saved').textContent = ''; }, 2000);
});

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = $('addUrl').value.trim();
  const msg = $('addMsg');
  let origin;
  try { const u = new URL(url); if (u.protocol !== 'https:') throw 0; origin = u.origin + '/*'; } catch { msg.textContent = t('optAddFail'); msg.className = 'warn'; return; }
  const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false);
  const r = granted ? await send({ type: 'addList', url }) : { ok: false };
  msg.className = r.ok ? 'muted' : 'warn';
  msg.textContent = r.ok ? t('optAddHint') : t('optAddFail');
  if (r.ok) $('addUrl').value = '';
  renderLists();
});

$('testForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  let host = $('testHost').value.trim();
  try { host = new URL(host.includes('://') ? host : 'https://' + host).hostname; } catch { /* keep as typed */ }
  host = normalizeHost(host);
  const r = await send({ type: 'check', hosts: [host] });
  const v = r?.verdicts?.[host];
  const out = $('testOut');
  out.className = v ? 'warn' : 'ok';
  const { lists } = await getState();
  out.textContent = v ? t('optTestHit', v.rule, v.list === 'user' ? t('listUser') : listName(v.list, lists[v.list] || {})) : t('optTestClean');
});

chrome.storage.onChanged.addListener((c) => { if (c.userBlock || c.userAllow) renderMine(); });
renderLists();
renderMine();
