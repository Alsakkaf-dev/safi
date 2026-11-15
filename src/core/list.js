// Blocklist parsing. Accepts the formats people already publish:
//   example.com            plain domain
//   *://*.example.com/*    uBlacklist / match pattern (host part only)
//   0.0.0.0 example.com    hosts file
//   ||example.com^         adblock network rule
//   @@… or @…              exception (allow) in any of the above forms
// Lines that need full-URL or regex matching are counted as skipped, never guessed at.

const HOST = /^(?:[a-z0-9¡-￿](?:[a-z0-9¡-￿-]{0,61}[a-z0-9¡-￿])?\.)+[a-z¡-￿][a-z0-9¡-￿-]{1,62}$/i;

export function normalizeHost(host) {
  if (!host) return '';
  let h = String(host).trim().toLowerCase().replace(/\.$/, '');
  if (h.startsWith('www.')) h = h.slice(4);
  return h;
}

function hostFromRule(rule) {
  let r = rule;
  // match pattern: scheme://host/path
  let m = r.match(/^(?:\*|https?|ftp):\/\/([^/]+)(\/.*)?$/i);
  if (m) {
    if (m[2] && m[2] !== '/' && m[2] !== '/*') return null; // path-specific: not a whole-site rule
    r = m[1].replace(/^\*\./, '');
  } else if ((m = r.match(/^\|\|([^/^$*]+)\^?(?:\$.*)?$/))) {
    r = m[1];
  } else if ((m = r.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)$/))) {
    r = m[1];
  }
  r = normalizeHost(r);
  return HOST.test(r) ? r : null;
}

export function parseList(text) {
  const block = new Set();
  const allow = new Set();
  let skipped = 0;
  const meta = {};
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
  let inFrontMatter = lines[0]?.trim() === '---';
  for (let i = inFrontMatter ? 1 : 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (inFrontMatter) {
      if (line === '---') inFrontMatter = false;
      else { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2]; }
      continue;
    }
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('[')) continue;
    line = line.replace(/\s+#.*$/, '');
    let target = block;
    if (line.startsWith('@@')) { target = allow; line = line.slice(2); }
    else if (line.startsWith('@')) { target = allow; line = line.replace(/^@\d*/, ''); }
    const host = hostFromRule(line);
    if (host) target.add(host); else skipped++;
  }
  return { block: [...block], allow: [...allow], skipped, meta };
}
