# Design notes

Short answers to "why is it built this way?".

## Lists, not detection

Safi does not try to detect machine-written text. Automatic detection is probabilistic and wrong often enough to hurt honest sites. Instead it applies human-reviewed domain lists, the same model ad blockers use. The trade-off: a list only knows the sites someone reported, so coverage grows with the community, and governance (who decides) matters more than code. `lists/CRITERIA.md` is that governance.

## Marking by default, hiding by choice

A new list will contain mistakes. Marking a result costs the reader a glance; hiding a good site costs them the answer. So the default is to mark, and "this site is fine" always overrides any list.

## Matching lives in the service worker

Some public lists hold hundreds of thousands of domains. Loading that into every search page would cost memory and time on each page load. The content script sends only the hostnames on the page to the background worker, which keeps the lists in `Set`s and answers with verdicts. A lookup walks the host's parent domains (`a.b.example.com`, `b.example.com`, `example.com`), so cost depends on the number of labels in the host, not on list size. The test suite checks 1,000 lookups against a 300,000-rule list in under 200 ms.

## Finding results structurally

Search engines rename CSS classes constantly. Safi selects only the result's title link (a link containing a heading on Google, `li.b_algo h2 a` on Bing, the title test id on DuckDuckGo) and then derives the result box as the largest ancestor that still contains exactly one title link. That rule holds across layout changes that would break class-based selectors.

## Redirect links

Engines wrap destinations (`google.com/url?q=`, `bing.com/ck/a?u=a1<base64>`, `duckduckgo.com/l/?uddg=`). `unwrapUrl` recovers the real target so matching uses the destination site, never the engine's own domain.

## When the link hides the destination

Checked against live pages on 15 Nov 2026: one Google layout sends every result through an opaque `google.com/goto?url=<token>` link, so the destination cannot be read from the link at all. In that case Safi reads the site address Google prints under the title (the `<cite>` breadcrumb). Results that show no address there (video cards) are left alone rather than guessed at. Bing's `ck/a` links decoded correctly on a live page; when one fails to decode, the same `<cite>` fallback applies.

## Parser honesty

The parser accepts four common rule forms and counts every line it cannot apply (regex and path-specific rules) instead of approximating it. A whole-site block must never come from a rule its author wrote for one path.

## Privacy by construction

There is no server. Reports go through GitHub issues that the user submits themselves. The only host permission is for downloading list files; custom list hosts are requested one at a time when the user adds them.

## Known limits

- Result detection is verified on saved page structures, plus one manual check on live Google and Bing pages. DuckDuckGo has only been tested on a saved structure.
- On Google layouts with opaque links, video results that show no site address are not checked.
- Google is matched on a fixed set of country domains listed in the manifest.
- Path-level and regex rules in third-party lists are skipped.
- The Arabic list starts empty and depends on reports.
