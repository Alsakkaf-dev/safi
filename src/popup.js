import { getState, setState } from './core/store.js';
import { detectEngine } from './core/serp.js';
import { t, send, localize } from './ui.js';

localize();
const $ = (id) => document.getElementById(id);

async function render() {
  const s = await getState();
  $('enabled').checked = s.enabled;
  $('state').textContent = t(s.enabled ? 'popOn' : 'popOff');
  $(s.mode === 'hide' ? 'modeHide' : 'modeLabel').checked = true;
  $('total').textContent = s.stats.flagged.toLocaleString();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let onSerp = false;
  try { onSerp = !!detectEngine(new URL(tab.url).hostname); } catch { /* no url access outside result pages */ }
  const r = tab ? await send({ type: 'tabCount', tabId: tab.id }) : { count: 0 };
  $('page').textContent = (r?.count || 0).toLocaleString();
  if (!onSerp && !r?.count) $('state').textContent += ' · ' + t('popNoSerp');
}

$('enabled').addEventListener('change', async (e) => { await setState({ enabled: e.target.checked }); render(); });
for (const id of ['modeLabel', 'modeHide']) $(id).addEventListener('change', (e) => setState({ mode: e.target.value }));
$('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
render();
