# Safi · صافي

**نتائج بحث بلا مزارع محتوى.** إضافة متصفح تضع علامة على نتائج البحث القادمة من مزارع المحتوى والمواقع المولَّدة آليًا، أو تخفيها. تعمل داخل متصفحك فقط ولا تجمع أي بيانات.

**Search results without content farms.** A browser extension that marks or hides search results from content farms and machine-made spam sites. It runs entirely in your browser and collects nothing.

Works on Google, Bing and DuckDuckGo. Interface in Arabic and English.

## الحالة الحالية / Status

Version 0.1.0, not yet on the Chrome Web Store.

- The extension, list engine and settings are complete and tested.
- It ships with one third-party list (AI-generated image sites) and can subscribe to others.
- **The Arabic list is empty.** It is filled only through reviewed reports with evidence, see [lists/CRITERIA.md](lists/CRITERIA.md). Until then the Arabic value comes from your own block list and the one-click "block this site" button.
- Result detection is tested against saved page structures and was checked once on live Google and Bing pages. Search engines change their pages often, so breakage is expected over time and fixes are welcome.

## What it does

- Marks a flagged result with a small bar naming the site and the list that flagged it, or collapses it (your choice).
- Adds a "block this site" control to every other result. One click hides that site from then on and offers to report it to the public list.
- Lets you exempt any site ("this site is fine") so a list can never overrule you.
- Updates subscribed lists once a day from their public text files.

## Privacy

Safi never sends your searches or the sites you visit anywhere. Matching happens inside the extension. Its only network activity is downloading list files. See [PRIVACY.md](PRIVACY.md).

## Install from source

```
npm install
npm run build
```

Then open `chrome://extensions`, turn on Developer mode, choose "Load unpacked" and select the `dist` folder.

## Develop

```
npm test        # unit tests for the list parser, matcher and result detection
npm run build   # bundle into dist/
```

| Path | Role |
|---|---|
| `src/core/list.js` | Reads block lists (uBlacklist patterns, plain domains, hosts files, adblock rules) |
| `src/core/matcher.js` | Decides if a host is flagged; exceptions and the user's lists win |
| `src/core/serp.js` | Finds results on a search page and unwraps redirect links |
| `src/background.js` | Service worker: holds the lists, answers lookups, refreshes daily |
| `src/content.js` | Marks results on the page |
| `src/popup.js`, `src/options.js` | Toolbar popup and settings page |
| `lists/` | Bundled lists and the criteria for the Arabic list |
| `docs/DESIGN.md` | Why it is built this way |

## Report a site

Open a ["Report a site" issue](https://github.com/Alsakkaf-dev/safi/issues/new?template=report-site.yml) with example pages. Reports are judged against [lists/CRITERIA.md](lists/CRITERIA.md).

## Credits

Bundled list: [uBlockOrigin & uBlacklist Huge AI Blocklist](https://github.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist) by laylavish (CC0). Optional subscriptions link to their authors' repositories from the settings page.

## License

MIT © Mohammed Alsakkaf
