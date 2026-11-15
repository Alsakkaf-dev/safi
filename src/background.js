// Service worker: owns the lists, answers "is this host flagged?" for content scripts,
// and refreshes subscribed lists once a day. Lists stay in the worker so that a page
// never has to load hundreds of thousands of rules itself.
import { parseList } from './core/list.js';
import { Matcher } from './core/matcher.js';
import { CATALOG, DEFAULTS, getState, setState, dataKey } from './core/store.js';

let matcherPromise = null;
const invalidate = () => { matcherPromise = null; };

function entryFor(id, state) {
  return CATALOG.find((c) => c.id === id) || (state.lists[id]?.custom ? { id, url: state.lists[id].url, bundled: null } : null);
}

async function loadListText(entry) {
  const stored = (await chrome.storage.local.get(dataKey(entry.id)))[dataKey(entry.id)];
  if (stored) return stored;
  if (!entry.bundled) return '';
  const res = await fetch(chrome.runtime.getURL(entry.bundled));
  return res.ok ? res.text() : '';
}

async function buildMatcher() {
  const state = await getState();
  const lists = [];
  for (const [id, info] of Object.entries(state.lists)) {
    if (!info.on) continue;
    const entry = entryFor(id, state);
    if (!entry) continue;
    const parsed = parseList(await loadListText(entry));
    lists.push({ id, block: parsed.block, allow: parsed.allow });
  }
  return new Matcher({ lists, userBlock: state.userBlock, userAllow: state.userAllow });
}
const getMatcher = () => (matcherPromise ||= buildMatcher());

async function refreshList(id) {
  const state = await getState();
  const entry = entryFor(id, state);
  if (!entry?.url) return { ok: false, error: 'no-url' };
  try {
    const res = await fetch(entry.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseList(text);
    if (!parsed.block.length && text.trim()) throw new Error('no-rules');
    await chrome.storage.local.set({ [dataKey(id)]: text });
    const lists = (await getState()).lists;
    lists[id] = { ...lists[id], count: parsed.block.length, skipped: parsed.skipped, updated: Date.now(), error: null };
    await setState({ lists });
    invalidate();
    return { ok: true, count: parsed.block.length };
  } catch (e) {
    const lists = (await getState()).lists;
    lists[id] = { ...lists[id], error: String(e.message || e) };
    await setState({ lists });
    return { ok: false, error: String(e.message || e) };
  }
}

async function ensureSetup() {
  const state = await getState();
  const lists = { ...state.lists };
  let changed = false;
  for (const c of CATALOG) {
    if (lists[c.id]) continue;
    let count = 0, skipped = 0;
    if (c.bundled) {
      const parsed = parseList(await loadListText(c));
      count = parsed.block.length; skipped = parsed.skipped;
    }
    lists[c.id] = { on: c.defaultOn, count, skipped, updated: 0, error: null };
    changed = true;
  }
  if (changed) await setState({ lists, stats: state.stats.since ? state.stats : { flagged: 0, since: Date.now() } });
}

async function refreshAll() {
  const { lists } = await getState();
  for (const [id, info] of Object.entries(lists)) if (info.on) await refreshList(id);
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSetup();
  chrome.alarms.create('refresh', { periodInMinutes: 24 * 60, delayInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(ensureSetup);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'refresh') refreshAll(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.userBlock || changes.userAllow || changes.lists)) invalidate();
});

const handlers = {
  async check({ hosts }) {
    await ensureSetup();
    const state = await getState();
    if (!state.enabled) return { enabled: false, mode: state.mode, verdicts: {} };
    return { enabled: true, mode: state.mode, verdicts: (await getMatcher()).checkMany(hosts || []) };
  },
  async flagged({ count }, sender) {
    const { stats } = await getState();
    await setState({ stats: { ...stats, flagged: stats.flagged + count } });
    if (sender.tab?.id != null) {
      const key = `tab:${sender.tab.id}`;
      const prev = (await chrome.storage.session.get(key))[key] || 0;
      await chrome.storage.session.set({ [key]: prev + count });
      chrome.action.setBadgeBackgroundColor({ color: '#0f766e', tabId: sender.tab.id });
      chrome.action.setBadgeText({ text: String(prev + count), tabId: sender.tab.id });
    }
    return {};
  },
  async pageReset(_, sender) {
    if (sender.tab?.id != null) {
      await chrome.storage.session.remove(`tab:${sender.tab.id}`);
      chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
    }
    return {};
  },
  async block({ host }) {
    const s = await getState();
    await setState({ userBlock: [...new Set([...s.userBlock, host])], userAllow: s.userAllow.filter((h) => h !== host) });
    return {};
  },
  async allow({ host }) {
    const s = await getState();
    await setState({ userAllow: [...new Set([...s.userAllow, host])], userBlock: s.userBlock.filter((h) => h !== host) });
    return {};
  },
  async refresh({ id }) { return id ? refreshList(id) : (await refreshAll(), { ok: true }); },
  async toggleList({ id, on }) {
    const { lists } = await getState();
    lists[id] = { ...lists[id], on };
    await setState({ lists });
    if (on && !lists[id].updated && !CATALOG.find((c) => c.id === id)?.bundled) return refreshList(id);
    return { ok: true };
  },
  async addList({ url }) {
    const id = 'custom-' + Math.abs([...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
    const { lists } = await getState();
    lists[id] = { on: true, custom: true, url, count: 0, skipped: 0, updated: 0, error: null };
    await setState({ lists });
    const r = await refreshList(id);
    if (!r.ok) { const l = (await getState()).lists; delete l[id]; await setState({ lists: l }); }
    return r;
  },
  async removeList({ id }) {
    const { lists } = await getState();
    if (!lists[id]?.custom) return { ok: false };
    delete lists[id];
    await setState({ lists });
    await chrome.storage.local.remove(dataKey(id));
    return { ok: true };
  },
  async tabCount({ tabId }) {
    const key = `tab:${tabId}`;
    return { count: (await chrome.storage.session.get(key))[key] || 0 };
  },
};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const fn = handlers[msg?.type];
  if (!fn) return false;
  fn(msg, sender).then(reply, (e) => reply({ error: String(e) }));
  return true;
});
