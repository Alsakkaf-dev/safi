import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { parseList, normalizeHost } from '../src/core/list.js';
import { Matcher } from '../src/core/matcher.js';
import { detectEngine, unwrapUrl, findResults } from '../src/core/serp.js';

describe('list parsing', () => {
  const text = `---
name: Demo
---
# comment
! comment
*://*.farm.example/*
spam.example
0.0.0.0 hosts.example
||adblock.example^
@@*://*.ok.farm.example/*
@*://allowed.example/*
*://*.site.example/only/this/path/*
/regex\\.example/
title/Something/
WWW.Upper.Example.
موقع.example
not a domain`;
  const p = parseList(text);
  it('reads every supported rule form', () => {
    expect(p.block.sort()).toEqual(['adblock.example', 'farm.example', 'hosts.example', 'spam.example', 'upper.example', 'موقع.example'].sort());
    expect(p.allow.sort()).toEqual(['allowed.example', 'ok.farm.example']);
    expect(p.meta.name).toBe('Demo');
  });
  it('counts what it cannot apply instead of guessing', () => {
    expect(p.skipped).toBe(4);
  });
  it('normalises hosts', () => {
    expect(normalizeHost(' WWW.Example.COM. ')).toBe('example.com');
  });
  it('parses the bundled lists without choking', () => {
    const huge = parseList(readFileSync('lists/huge-ai.txt', 'utf8'));
    expect(huge.block.length).toBeGreaterThan(500);
    expect(parseList(readFileSync('lists/safi-ar.txt', 'utf8')).meta.name).toBe('Safi Arabic list');
  });
});

describe('matcher', () => {
  const m = new Matcher({
    lists: [{ id: 'a', block: ['farm.example', 'spam.example'], allow: ['ok.farm.example'] }, { id: 'b', block: ['spam.example', 'other.example'] }],
    userBlock: ['mine.example'], userAllow: ['other.example'],
  });
  it('covers subdomains and www', () => {
    expect(m.check('www.farm.example')).toEqual({ list: 'a', rule: 'farm.example' });
    expect(m.check('deep.sub.farm.example')?.rule).toBe('farm.example');
  });
  it('does not match lookalikes or bare TLDs', () => {
    expect(m.check('notfarm.example')).toBeNull();
    expect(m.check('example')).toBeNull();
    expect(m.check('')).toBeNull();
  });
  it('lets exceptions and the user override lists', () => {
    expect(m.check('ok.farm.example')).toBeNull();
    expect(m.check('other.example')).toBeNull();
    expect(m.check('x.mine.example')).toEqual({ list: 'user', rule: 'mine.example' });
  });
  it('checks in bulk and stays fast on a large list', () => {
    const big = new Matcher({ lists: [{ id: 'big', block: Array.from({ length: 300000 }, (_, i) => `site${i}.example`) }] });
    const t0 = performance.now();
    const out = big.checkMany(Array.from({ length: 1000 }, (_, i) => `a.b.site${i * 7}.example`));
    expect(Object.keys(out)).toHaveLength(1000);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('search pages', () => {
  it('recognises engines', () => {
    expect(detectEngine('www.google.com.sa')).toBe('google');
    expect(detectEngine('www.bing.com')).toBe('bing');
    expect(detectEngine('duckduckgo.com')).toBe('duckduckgo');
    expect(detectEngine('notgoogle.com')).toBeNull();
    expect(detectEngine('google.evil.example.com')).toBeNull();
  });
  it('unwraps redirect links', () => {
    expect(unwrapUrl('/url?q=https://farm.example/123&sa=U', 'https://www.google.com/search')).toBe('https://farm.example/123');
    expect(unwrapUrl('https://www.bing.com/ck/a?u=a1aHR0cHM6Ly9mYXJtLmV4YW1wbGUvcGFnZQ')).toBe('https://farm.example/page');
    expect(unwrapUrl('//duckduckgo.com/l/?uddg=https%3A%2F%2Fgood-site.example%2Fp', 'https://duckduckgo.com/')).toBe('https://good-site.example/p');
    expect(unwrapUrl('javascript:void(0)')).toBeNull();
  });
  const load = (name, url) => new JSDOM(readFileSync(`tests/fixtures/${name}.html`, 'utf8'), { url }).window.document;
  it('finds Google results and their boxes', () => {
    const rs = findResults(load('google', 'https://www.google.com/search?q=x'), 'google', 'https://www.google.com/search?q=x');
    expect(rs.map((r) => r.host)).toEqual(['good-site.example', 'farm.example', 'sub.spam.example', 'opaque-farm.example']);
    expect(rs.every((r) => r.el.classList.contains('MjjYud'))).toBe(true);
    expect(new Set(rs.map((r) => r.el)).size).toBe(4);
  });
  it('finds Bing results, skipping ads', () => {
    const rs = findResults(load('bing', 'https://www.bing.com/search?q=x'), 'bing', 'https://www.bing.com/search?q=x');
    expect(rs.map((r) => r.host)).toEqual(['farm.example', 'good-site.example']);
    expect(rs[0].el.tagName).toBe('LI');
  });
  it('finds DuckDuckGo results', () => {
    const rs = findResults(load('ddg', 'https://duckduckgo.com/?q=x'), 'duckduckgo', 'https://duckduckgo.com/?q=x');
    expect(rs.map((r) => r.host)).toEqual(['farm.example', 'good-site.example']);
    expect(rs[0].el.tagName).toBe('LI');
  });
});
