// Runs on search result pages. Asks the background worker about each result's site,
// then marks or collapses the flagged ones, and adds a small "block this site" control.
import { detectEngine, findResults } from './core/serp.js';

const t = (k, ...a) => chrome.i18n.getMessage(k, a) || k;
const engine = detectEngine(location.hostname);
const REPO = 'https://github.com/Alsakkaf-dev/safi';
const done = new WeakSet();
let pending = false;

const send = (msg) => new Promise((res) => {
  try { chrome.runtime.sendMessage(msg, (r) => res(chrome.runtime.lastError ? null : r)); } catch { res(null); }
});

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function reportUrl(host) {
  const q = new URLSearchParams({ template: 'report-site.yml', title: `[report] ${host}`, domain: host });
  return `${REPO}/issues/new?${q}`;
}

function mark(result, verdict, mode) {
  const { el: box, host } = result;
  box.classList.add('safi-flagged');
  box.dataset.safiHost = host;
  const bar = el('div', 'safi-bar');
  bar.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
  const listName = verdict.list === 'user' ? t('listUser') : (t('list_' + verdict.list.replace(/-/g, '_')) || verdict.list);
  bar.append(el('span', 'safi-tag', t('flagged')), el('span', 'safi-why', `${host} · ${listName}`));

  const show = el('button', 'safi-btn', t('show'));
  show.type = 'button';
  show.addEventListener('click', () => {
    const hidden = box.classList.toggle('safi-collapsed');
    show.textContent = hidden ? t('show') : t('hide');
  });
  const allow = el('button', 'safi-btn', t('allowSite'));
  allow.type = 'button';
  allow.addEventListener('click', async () => {
    await send({ type: 'allow', host });
    box.classList.remove('safi-flagged', 'safi-collapsed');
    bar.remove();
  });
  bar.append(show, allow);
  box.prepend(bar);
  if (mode === 'hide') box.classList.add('safi-collapsed'); else show.textContent = t('hide');
  if (mode !== 'hide') show.remove();
}

function addBlockControl(result) {
  const { el: box, host } = result;
  const btn = el('button', 'safi-block', t('blockSite'));
  btn.type = 'button';
  btn.title = t('blockSiteTitle', host);
  btn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    await send({ type: 'block', host });
    btn.remove();
    for (const r of findResults(document, engine, location.href)) {
      if (r.host === host && !r.el.classList.contains('safi-flagged')) mark(r, { list: 'user', rule: host }, 'hide');
    }
    const note = el('div', 'safi-note');
    note.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
    const link = el('a', null, t('reportSite'));
    link.href = reportUrl(host); link.target = '_blank'; link.rel = 'noopener noreferrer';
    note.append(el('span', null, t('blockedNote', host) + ' '), link);
    box.prepend(note);
  });
  box.append(btn);
}

async function scan() {
  pending = false;
  if (!engine) return;
  const fresh = findResults(document, engine, location.href).filter((r) => !done.has(r.el));
  if (!fresh.length) return;
  fresh.forEach((r) => done.add(r.el));
  const res = await send({ type: 'check', hosts: [...new Set(fresh.map((r) => r.host))] });
  if (!res || !res.enabled) return;
  let count = 0;
  for (const r of fresh) {
    const v = res.verdicts[r.host];
    if (v) { mark(r, v, res.mode); count++; } else addBlockControl(r);
  }
  if (count) send({ type: 'flagged', count });
}

function schedule() {
  if (pending) return;
  pending = true;
  setTimeout(scan, 120);
}

if (engine) {
  send({ type: 'pageReset' }).then(scan);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
}
