// Decides whether a host is flagged, and by which list.
// A rule for example.com also covers every subdomain. Exceptions win over blocks,
// and the user's own lists win over everything subscribed.
import { normalizeHost } from './list.js';

function* suffixes(host) {
  let h = host;
  while (h.includes('.')) {
    yield h;
    h = h.slice(h.indexOf('.') + 1);
  }
}

export class Matcher {
  constructor({ lists = [], userBlock = [], userAllow = [] } = {}) {
    this.lists = lists.map((l) => ({ id: l.id, block: new Set(l.block), allow: new Set(l.allow || []) }));
    this.userBlock = new Set(userBlock.map(normalizeHost));
    this.userAllow = new Set(userAllow.map(normalizeHost));
  }

  /** @returns {{list: string, rule: string} | null} */
  check(rawHost) {
    const host = normalizeHost(rawHost);
    if (!host) return null;
    const chain = [...suffixes(host)];
    if (chain.some((h) => this.userAllow.has(h))) return null;
    const own = chain.find((h) => this.userBlock.has(h));
    if (own) return { list: 'user', rule: own };
    if (this.lists.some((l) => chain.some((h) => l.allow.has(h)))) return null;
    for (const l of this.lists) {
      const rule = chain.find((h) => l.block.has(h));
      if (rule) return { list: l.id, rule };
    }
    return null;
  }

  checkMany(hosts) {
    const out = {};
    for (const h of hosts) { const v = this.check(h); if (v) out[h] = v; }
    return out;
  }
}
