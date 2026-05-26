/**
 * Lucide-style SVG icons (vanilla JS — same visual language as lucide-react).
 * @see https://lucide.dev
 */

/** Standard UI icon size (Lucide stroke icons). */
export const ICON_SIZE = 22;
export const ICON_SIZE_LG = 24;
/** @deprecated Use ICON_SIZE — kept for imports during migration */
export const ICON_SIZE_SM = ICON_SIZE;
export const ICON_STROKE_WIDTH = 2;

/** @type {Record<string, string>} */
const STROKE = {
  activity: `<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a2 2 0 0 1-1.94 1.46H9.24a2 2 0 0 1-1.93-1.46L4.96 12.04"/><path d="m6 17 3-7"/><path d="M6 10h12"/>`,
  alertTriangle: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  apple: `<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5.05c-1.5 0-2.75 1.06-4 1.06-3 0-6 8-6 12.22A4.91 4.91 0 0 0 7 18.95c1.5 0 2.75-1.06 4-1.06z"/><path d="M12 2c1 2 2 2.5 2 5"/>`,
  arrowRight: `<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`,
  bell: `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
  bellOff: `<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742"/><path d="m2 2 20 20"/><path d="M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05"/>`,
  bookOpen: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  brain: `<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M20.52 10.448a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>`,
  brush: `<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.06 15.94 3 20l4.05-4.05"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  chefHat: `<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.89-.72-1.65-1.59-1.65H7.59C6.72 13 6 13.76 6 14.65V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/><path d="M6 9.27V6h12v3.27"/><path d="M9 3h6"/><path d="M8 6V3"/><path d="M16 6V3"/>`,
  circle: `<circle cx="12" cy="12" r="10"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
  clipboardList: `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
  crown: `<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>`,
  droplet: `<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5-2.5-1-2.5-1.5 0-.5 2.5-2 4.6-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>`,
  dumbbell: `<path d="M14.4 14.4 18 18"/><path d="M6.6 6.6 3 3"/><path d="M14.4 9.6 18 6"/><path d="M6.6 17.4 3 21"/><path d="M21 3 18.6 5.4"/><path d="M3 21 5.4 18.6"/><path d="M14.4 14.4 9.6 9.6"/><path d="M9.6 14.4 14.4 9.6"/>`,
  flame: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
  flower2: `<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m0 0a3 3 0 1 1 3 3m-3-3v1m3 3h1m0 0a3 3 0 1 0 3-3m-3 3v1m3-3h1"/><path d="M12 17v5"/><path d="M9 21h6"/>`,
  folderOpen: `<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>`,
  footprints: `<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.22-3 2-3 1.23 0 2.05 1.23 2 3 .05 2.5-1 3.5-1 5.62V16"/><path d="M9 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.22-3-2-3-1.23 0-2.05 1.23-2 3-.05 2.5 1 3.5 1 5.62V20"/><path d="M4 16h5"/><path d="M9 20h5"/>`,
  gem: `<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>`,
  hand: `<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 9.5V4a2 2 0 0 0-4 0v10"/><path d="M18 8a2 2 0 1 1 4 0v8a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.7-2.2A6.18 6.18 0 0 1 4 14.5V12a2 2 0 1 1 4 0v1.5"/>`,
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
  inbox: `<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  medal: `<path d="M7.21 15 2.66 7.14a2 2 0 0 1 1.13-2.7l8.38-3.31a2 2 0 0 1 1.45 0l8.38 3.31a2 2 0 0 1 1.13 2.7L16.79 15"/><path d="M11.51 17.5 8.72 21l2.79-2.5 2.79 2.5-2.79-3.5Z"/><circle cx="12" cy="11" r="4"/>`,
  messageCircle: `<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`,
  moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
  notebookPen: `<path d="M13 21h8"/><path d="M21.377 16.623a1 1 0 0 0-.381-1.3l-9.163-4.911a1 1 0 0 0-1.265.633l-1.732 5.432a1 1 0 0 0 .644 1.205l9.13 3.379a1 1 0 0 0 1.267-.442z"/><path d="M8 12h.01"/><path d="M7 16h.01"/><path d="M11 8h.01"/><path d="M15 12h.01"/><path d="M16 16h.01"/>`,
  package: `<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>`,
  plus: `<path d="M5 12h14"/><path d="M12 5v14"/>`,
  rocket: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`,
  rotateCw: `<path d="M21 12a9 9 0 0 0-9-9 7.18 7.18 0 0 0-5.07 2.09"/><path d="M21 3v5h-5"/><path d="M3 12a9 9 0 0 0 9 9 7.18 7.18 0 0 0 5.07-2.09"/><path d="M8 16H3v5"/>`,
  scrollText: `<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H8"/><path d="M9 21h6"/><path d="M9 3h1"/><path d="M15 21v-4a2 2 0 0 1 2-2h1"/><path d="M9 17H6a2 2 0 0 0-2 2v2"/>`,
  shield: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`,
  shieldCheck: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
  smartphone: `<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`,
  snowflake: `<path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>`,
  sparkles: `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>`,
  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
  swords: `<polyline points="14.5 17.5 10 22 4 22 4 16 8.5 11.5"/><polyline points="9.5 6.5 14 2 20 2 20 8 15.5 12.5"/><path d="M14.5 17.5 20 22"/><path d="M8.5 11.5 2 6"/><path d="M9.5 6.5 3 2"/><path d="M15.5 12.5 21 8"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  trophy: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  unlock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  wallet: `<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v2a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  wind: `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>`,
  zap: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>`,
  circleCheck: `<path d="M22 11.08V12a10 10 0 0 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>`,
};

export const ICON = {
  check: "check",
  plus: "plus",
  alert: "alertTriangle",
  crown: "crown",
  lock: "lock",
  unlock: "unlock",
  bell: "bell",
  arrowRight: "arrowRight",
  zap: "zap",
  x: "x",
  rotateCw: "rotateCw",
};

/** @typedef {{ fg: string; bg: string }} IconPaletteEntry */

/** Vibrant per-icon colors for quests, badges, and feature icons. */
/** @type {Record<string, IconPaletteEntry>} */
export const ICON_PALETTE = {
  default: { fg: "#60a5fa", bg: "rgba(96, 165, 250, 0.22)" },
  activity: { fg: "#fb923c", bg: "rgba(251, 146, 60, 0.22)" },
  alertTriangle: { fg: "#f87171", bg: "rgba(248, 113, 113, 0.22)" },
  apple: { fg: "#4ade80", bg: "rgba(74, 222, 128, 0.22)" },
  arrowRight: { fg: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" },
  bell: { fg: "#fbbf24", bg: "rgba(251, 191, 36, 0.22)" },
  bookOpen: { fg: "#a78bfa", bg: "rgba(167, 139, 250, 0.22)" },
  brain: { fg: "#f472b6", bg: "rgba(244, 114, 182, 0.22)" },
  brush: { fg: "#a3e635", bg: "rgba(163, 230, 53, 0.22)" },
  check: { fg: "#22c55e", bg: "rgba(34, 197, 94, 0.22)" },
  chefHat: { fg: "#fdba74", bg: "rgba(253, 186, 116, 0.24)" },
  circle: { fg: "#c4b5fd", bg: "rgba(196, 181, 253, 0.22)" },
  clock: { fg: "#60a5fa", bg: "rgba(96, 165, 250, 0.2)" },
  circleCheck: { fg: "#22c55e", bg: "rgba(34, 197, 94, 0.22)" },
  clipboardList: { fg: "#94a3b8", bg: "rgba(148, 163, 184, 0.22)" },
  crown: { fg: "#fcd34d", bg: "rgba(252, 211, 77, 0.24)" },
  droplet: { fg: "#38bdf8", bg: "rgba(56, 189, 248, 0.24)" },
  dumbbell: { fg: "#f87171", bg: "rgba(248, 113, 113, 0.22)" },
  flame: { fg: "#fb923c", bg: "rgba(251, 146, 60, 0.24)" },
  folderOpen: { fg: "#60a5fa", bg: "rgba(96, 165, 250, 0.2)" },
  footprints: { fg: "#2dd4bf", bg: "rgba(45, 212, 191, 0.22)" },
  gem: { fg: "#22d3ee", bg: "rgba(34, 211, 238, 0.22)" },
  hand: { fg: "#f9a8d4", bg: "rgba(249, 168, 212, 0.22)" },
  heart: { fg: "#fb7185", bg: "rgba(251, 113, 133, 0.22)" },
  inbox: { fg: "#818cf8", bg: "rgba(129, 140, 248, 0.22)" },
  lock: { fg: "#94a3b8", bg: "rgba(148, 163, 184, 0.2)" },
  medal: { fg: "#fbbf24", bg: "rgba(251, 191, 36, 0.24)" },
  messageCircle: { fg: "#f472b6", bg: "rgba(244, 114, 182, 0.2)" },
  moon: { fg: "#818cf8", bg: "rgba(129, 140, 248, 0.22)" },
  notebookPen: { fg: "#fbbf24", bg: "rgba(251, 191, 36, 0.22)" },
  package: { fg: "#d97706", bg: "rgba(217, 119, 6, 0.2)" },
  plus: { fg: "#60a5fa", bg: "rgba(96, 165, 250, 0.18)" },
  rocket: { fg: "#c084fc", bg: "rgba(192, 132, 252, 0.22)" },
  scrollText: { fg: "#d4a574", bg: "rgba(212, 165, 116, 0.24)" },
  shield: { fg: "#6366f1", bg: "rgba(99, 102, 241, 0.22)" },
  shieldCheck: { fg: "#34d399", bg: "rgba(52, 211, 153, 0.22)" },
  smartphone: { fg: "#a78bfa", bg: "rgba(167, 139, 250, 0.22)" },
  snowflake: { fg: "#67e8f9", bg: "rgba(103, 232, 249, 0.22)" },
  sparkles: { fg: "#fde047", bg: "rgba(253, 224, 71, 0.24)" },
  star: { fg: "#facc15", bg: "rgba(250, 204, 21, 0.24)" },
  sun: { fg: "#fbbf24", bg: "rgba(251, 191, 36, 0.24)" },
  swords: { fg: "#94a3b8", bg: "rgba(148, 163, 184, 0.22)" },
  target: { fg: "#ef4444", bg: "rgba(239, 68, 68, 0.2)" },
  trophy: { fg: "#f59e0b", bg: "rgba(245, 158, 11, 0.24)" },
  unlock: { fg: "#34d399", bg: "rgba(52, 211, 153, 0.2)" },
  users: { fg: "#22d3ee", bg: "rgba(34, 211, 238, 0.2)" },
  wallet: { fg: "#34d399", bg: "rgba(52, 211, 153, 0.22)" },
  wind: { fg: "#7dd3fc", bg: "rgba(125, 211, 252, 0.22)" },
  x: { fg: "#94a3b8", bg: "rgba(148, 163, 184, 0.16)" },
  zap: { fg: "#facc15", bg: "rgba(250, 204, 21, 0.24)" },
  rotateCw: { fg: "#94a3b8", bg: "rgba(148, 163, 184, 0.18)" },
};

/** @param {string} name */
export function iconColorFor(name) {
  const key = name === "check" ? "check" : name;
  return ICON_PALETTE[key] ?? ICON_PALETTE.default;
}

/**
 * @param {string} name
 * @param {{ size?: number; filled?: boolean; className?: string; tone?: 'accent' | 'success' | 'muted' | 'inherit'; colorful?: boolean; color?: 'auto' | IconPaletteEntry; chip?: boolean; chipSize?: number }} [opts]
 */
export function iconHtml(name, opts = {}) {
  const size = opts.size ?? ICON_SIZE;
  const filled = opts.filled ?? false;
  const tone = opts.tone ?? "accent";
  const key = filled && name === "check" ? "circleCheck" : name;
  const inner = STROKE[key];
  if (!inner) return "";

  const palette =
    opts.color && typeof opts.color === "object"
      ? opts.color
      : opts.colorful || opts.color === "auto"
        ? iconColorFor(key)
        : null;

  const useChip = opts.chip !== false && !!palette;
  const toneClass =
    palette || tone === "inherit"
      ? ""
      : tone === "success"
        ? "lu-icon--success"
        : tone === "muted"
          ? "lu-icon--muted"
          : "lu-icon--accent";
  const extraCls = opts.className ?? "";
  const cls = ["lu-icon", toneClass, !useChip ? extraCls : ""].filter(Boolean).join(" ");
  const svgStyle = palette ? ` style="color:${palette.fg}"` : "";
  const svg = `<svg class="${cls}"${svgStyle} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  if (!useChip) return svg;

  const chipPx = opts.chipSize ?? (size >= ICON_SIZE_LG ? 48 : 40);
  const chipClass = ["icon-chip", extraCls].filter(Boolean).join(" ");
  return `<span class="${chipClass}" style="--icon-fg:${palette.fg};--icon-bg:${palette.bg};width:${chipPx}px;height:${chipPx}px" aria-hidden="true">${svg}</span>`;
}
