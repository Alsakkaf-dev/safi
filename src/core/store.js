// One place for everything the extension keeps in chrome.storage.local.
export const DEFAULTS = {
  enabled: true,
  mode: 'label', // 'label' marks a flagged result, 'hide' collapses it
  userBlock: [],
  userAllow: [],
  stats: { flagged: 0, since: 0 },
  lists: {},
};

// Lists the extension knows about. `bundled` ones ship inside the package and also update from `url`.
export const CATALOG = [
  {
    id: 'safi-ar', bundled: 'lists/safi-ar.txt', defaultOn: true,
    url: 'https://raw.githubusercontent.com/Alsakkaf-dev/safi/main/lists/safi-ar.txt',
    home: 'https://github.com/Alsakkaf-dev/safi',
  },
  {
    id: 'huge-ai', bundled: 'lists/huge-ai.txt', defaultOn: true,
    url: 'https://raw.githubusercontent.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist/main/list_uBlacklist.txt',
    home: 'https://github.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist',
  },
  {
    id: 'content-farms', bundled: null, defaultOn: false,
    url: 'https://raw.githubusercontent.com/wdmpa/content-farm-list/main/uBlacklist.txt',
    home: 'https://github.com/wdmpa/content-farm-list',
  },
  {
    id: 'seo-spam', bundled: null, defaultOn: false,
    url: 'https://raw.githubusercontent.com/NotaInutilis/Super-SEO-Spam-Suppressor/main/ublacklist.txt',
    home: 'https://github.com/NotaInutilis/Super-SEO-Spam-Suppressor',
  },
];

export async function getState() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}
export const setState = (patch) => chrome.storage.local.set(patch);
export const dataKey = (id) => `data:${id}`;
