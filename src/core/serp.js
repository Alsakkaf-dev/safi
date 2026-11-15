// Finds organic results on a search page and the site each one points to.
// Selectors target the title link only; the result box is then derived structurally
// (the largest ancestor that still contains exactly one title link), which survives
// most class-name churn on the search engines' side.
import { normalizeHost } from './list.js';

export const ENGINES = {
  google: { test: (h) => /(^|\.)google\.[a-z.]{2,6}$/.test(h), root: '#search, #rso, #botstuff, #main', link: 'a:has(h3)' },
  bing: { test: (h) => /(^|\.)bing\.com$/.test(h), root: '#b_results', link: 'li.b_algo h2 a' },
  duckduckgo: { test: (h) => /(^|\.)duckduckgo\.com$/.test(h), root: 'body', link: 'a[data-testid="result-title-a"], .result__a' },
};

export function detectEngine(hostname) {
  const h = String(hostname || '').toLowerCase();
  return Object.keys(ENGINES).find((k) => ENGINES[k].test(h)) || null;
}

function b64url(s) {
  try {
    const pad = s.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))));
  } catch { return null; }
}

/** Search engines often wrap the destination in their own redirect; return the real target. */
export function unwrapUrl(href, base = 'https://example.invalid/') {
  let u;
  try { u = new URL(href, base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  if (/(^|\.)google\.[a-z.]{2,6}$/.test(host) && (u.pathname === '/url' || u.pathname === '/imgres')) {
    const t = u.searchParams.get('q') || u.searchParams.get('url') || u.searchParams.get('imgrefurl');
    return t ? unwrapUrl(t, base) : null;
  }
  if (/(^|\.)bing\.com$/.test(host) && u.pathname.startsWith('/ck/')) {
    const p = u.searchParams.get('u');
    const t = p && p.startsWith('a1') ? b64url(p.slice(2)) : null;
    return t ? unwrapUrl(t, base) : null;
  }
  if (/(^|\.)duckduckgo\.com$/.test(host) && u.pathname.startsWith('/l/')) {
    const t = u.searchParams.get('uddg');
    return t ? unwrapUrl(t, base) : null;
  }
  return u.href;
}

export function findResults(doc, engine, base) {
  const cfg = ENGINES[engine];
  if (!cfg) return [];
  const roots = [...doc.querySelectorAll(cfg.root)];
  const seen = new Set();
  const out = [];
  for (const root of roots) {
    const links = [...root.querySelectorAll(cfg.link)];
    for (const a of links) {
      if (seen.has(a)) continue;
      seen.add(a);
      const url = unwrapUrl(a.getAttribute('href') || '', base);
      if (!url) continue;
      const host = normalizeHost(new URL(url).hostname);
      if (!host || detectEngine(host) === engine) continue; // the engine's own links are not results
      let box = a;
      while (box.parentElement && box.parentElement !== root && box.parentElement.querySelectorAll(cfg.link).length === 1) {
        box = box.parentElement;
      }
      if (box === a) box = a.parentElement || a;
      out.push({ el: box, link: a, url, host });
    }
  }
  // An outer root can re-find boxes an inner root already produced.
  const boxes = new Set();
  return out.filter((r) => (boxes.has(r.el) ? false : boxes.add(r.el)));
}
