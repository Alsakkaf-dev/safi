export const t = (k, ...a) => chrome.i18n.getMessage(k, a) || k;
export const send = (msg) => chrome.runtime.sendMessage(msg);
export function localize() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.documentElement.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
  for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
}
