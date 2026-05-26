/**
 * Bottom nav icons — Lucide-style SVG (outline inactive, filled active).
 * @see https://lucide.dev
 */

/** Primary bottom tabs only (most → least used, left to right). */
export const NAV_ITEMS = [
  { key: "home", label: "Home" },
  { key: "discipline", label: "Focus" },
  { key: "challenges", label: "Quests" },
  { key: "train", label: "Train" },
  { key: "account", label: "You" },
];

/** @type {Record<string, { outline: string; filled: string }>} */
const ICONS = {
  home: {
    outline: `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
    filled: `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" fill="currentColor" stroke="none"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>`,
  },
  challenges: {
    outline: `<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
    filled: `<path d="M8 2h8v4H8V2zm8 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2V4h8v2zM12 11h4v1h-4v-1zm-4 0h1v1H8v-1zm4 5h4v1h-4v-1zm-4 0h1v1H8v-1z" fill="currentColor" stroke="none"/>`,
  },
  achievements: {
    outline: `<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.45l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>`,
    filled: `<path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 15.5 7.1 17.5 8 11.9 4 8l5.6-1.2L12 2z" fill="currentColor" stroke="none"/>`,
  },
  train: {
    outline: `<path d="M14.4 14.4 18 18"/><path d="M6.6 6.6 3 3"/><path d="M14.4 9.6 18 6"/><path d="M6.6 17.4 3 21"/><path d="M21 3 18.6 5.4"/><path d="M3 21 5.4 18.6"/><path d="M14.4 14.4 9.6 9.6"/><path d="M9.6 14.4 14.4 9.6"/>`,
    filled: `<path d="M18 6l3-3-1.4-1.4-2.6 2.6-2.6-2.6L13 3l3 3-2.6 2.6 2.6 2.6L18 6zM6 18l-3 3 1.4 1.4 2.6-2.6 2.6 2.6L11 21l-3-3 2.6-2.6-2.6-2.6L6 18zm8.4-8.4-4.8-4.8-1.4 1.4 4.8 4.8 1.4-1.4zm-4.8 4.8 4.8 4.8 1.4-1.4-4.8-4.8-1.4 1.4z" fill="currentColor" stroke="none"/>`,
  },
  discipline: {
    outline: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    filled: `<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" stroke="none"/>`,
  },
  money: {
    outline: `<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>`,
    filled: `<path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm8 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" stroke="none"/>`,
  },
  account: {
    outline: `<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>`,
    filled: `<circle cx="12" cy="8" r="4" fill="currentColor" stroke="none"/><path d="M20 21a8 8 0 0 0-16 0" fill="currentColor" stroke="none"/>`,
  },
};

/**
 * @param {string} tabKey
 * @param {boolean} active
 */
export function navTabIcon(tabKey, active) {
  const def = ICONS[tabKey];
  if (!def) return "";
  const inner = active ? def.filled : def.outline;
  if (active) {
    return `<svg class="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${inner}</svg>`;
  }
  return `<svg class="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
