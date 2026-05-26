/** Theme presets + CSS variable application for LevelUp. */

/** @typedef {{ id: string; name: string; primary: string; secondary: string; accent: string }} ThemePreset */
/** @typedef {{ presetId: string; custom: { primary: string; secondary: string; accent: string } }} ThemeState */

export const DEFAULT_PRESET_ID = "midnight-dark";

/** @type {ThemePreset[]} */
export const THEME_PRESETS = [
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    primary: "#0a0c10",
    secondary: "#11141c",
    accent: "#3b82f6",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    primary: "#061018",
    secondary: "#0c1f2e",
    accent: "#22d3ee",
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    primary: "#140a08",
    secondary: "#241310",
    accent: "#f97316",
  },
  {
    id: "forest-green",
    name: "Forest Green",
    primary: "#07100c",
    secondary: "#0f1f18",
    accent: "#34d399",
  },
  {
    id: "soft-lavender",
    name: "Soft Lavender",
    primary: "#100c14",
    secondary: "#1a1424",
    accent: "#c084fc",
  },
];

const CUSTOM_PRESET_ID = "custom";

export function defaultThemeState() {
  const base = THEME_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? THEME_PRESETS[0];
  return {
    presetId: DEFAULT_PRESET_ID,
    custom: {
      primary: base.primary,
      secondary: base.secondary,
      accent: base.accent,
    },
  };
}

export function normalizeThemeState(raw) {
  const base = defaultThemeState();
  if (!raw || typeof raw !== "object") return base;
  const presetId =
    typeof raw.presetId === "string" &&
    (raw.presetId === CUSTOM_PRESET_ID || THEME_PRESETS.some((p) => p.id === raw.presetId))
      ? raw.presetId
      : base.presetId;
  const customIn = raw.custom && typeof raw.custom === "object" ? raw.custom : {};
  return {
    presetId,
    custom: {
      primary: sanitizeHex(customIn.primary, base.custom.primary),
      secondary: sanitizeHex(customIn.secondary, base.custom.secondary),
      accent: sanitizeHex(customIn.accent, base.custom.accent),
    },
  };
}

function sanitizeHex(value, fallback) {
  const s = String(value ?? "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s.toLowerCase() : fallback;
}

export function presetById(id) {
  return THEME_PRESETS.find((p) => p.id === id);
}

/** @returns {{ primary: string; secondary: string; accent: string; presetId: string; presetName: string }} */
export function resolveThemeColors(themeState) {
  const theme = normalizeThemeState(themeState);
  if (theme.presetId === CUSTOM_PRESET_ID) {
    return {
      presetId: CUSTOM_PRESET_ID,
      presetName: "Custom",
      primary: theme.custom.primary,
      secondary: theme.custom.secondary,
      accent: theme.custom.accent,
    };
  }
  const preset = presetById(theme.presetId) ?? THEME_PRESETS[0];
  return {
    presetId: preset.id,
    presetName: preset.name,
    primary: preset.primary,
    secondary: preset.secondary,
    accent: preset.accent,
  };
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[c(r), c(g), c(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function mix(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function lighten(hex, amount = 0.15) {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.r + (255 - rgb.r) * amount, rgb.g + (255 - rgb.g) * amount, rgb.b + (255 - rgb.b) * amount);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function textOnBackground(bgHex) {
  return relativeLuminance(bgHex) > 0.35 ? "#0a0c10" : "#eef1f8";
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Apply resolved colors as CSS custom properties on :root. */
export function applyTheme(themeState) {
  const colors = resolveThemeColors(themeState);
  const root = document.documentElement;
  const text = textOnBackground(colors.primary);
  const muted = relativeLuminance(colors.primary) > 0.35 ? rgba("#0a0c10", 0.62) : rgba(text, 0.58);
  const accentLight = lighten(colors.accent, 0.22);

  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--bg", colors.primary);
  root.style.setProperty("--bg-elevated", colors.secondary);
  root.style.setProperty("--text", text);
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--accent-dim", rgba(colors.accent, 0.18));
  root.style.setProperty("--accent-border", rgba(colors.accent, 0.45));
  root.style.setProperty("--accent-strong", rgba(colors.accent, 0.65));
  root.style.setProperty("--accent-light", accentLight);
  root.style.setProperty("--btn-primary-top", rgba(accentLight, 0.35));
  root.style.setProperty("--btn-primary-bottom", rgba(colors.accent, 0.14));
  root.style.setProperty("--nav-bg", rgba(colors.primary, 0.88));
  root.style.setProperty("--border", relativeLuminance(colors.primary) > 0.35 ? rgba("#0a0c10", 0.12) : rgba(text, 0.08));
  root.style.setProperty("--surface-inset", relativeLuminance(colors.primary) > 0.35 ? rgba("#0a0c10", 0.08) : rgba("#000000", 0.35));
  root.style.setProperty("--surface-hover", rgba(colors.accent, 0.12));
  root.style.setProperty("--progress-track", relativeLuminance(colors.primary) > 0.35 ? rgba("#0a0c10", 0.08) : rgba(text, 0.06));
  const shadowBase = relativeLuminance(colors.primary) > 0.35 ? rgba("#0a0c10", 1) : rgba("#000000", 1);
  root.style.setProperty("--shadow-color", shadowBase);
  root.style.setProperty("--shadow-soft", `0 1px 2px ${rgba(shadowBase, 0.06)}, 0 8px 24px ${rgba(shadowBase, 0.14)}`);
  root.style.setProperty("--shadow-elevated", `0 4px 12px ${rgba(shadowBase, 0.1)}, 0 16px 40px ${rgba(shadowBase, 0.2)}`);
  root.style.setProperty("--shadow-nav", `0 -4px 24px ${rgba(shadowBase, 0.18)}`);

  const sheetMix = mix(hexToRgb(colors.secondary), hexToRgb(colors.primary), 0.25);
  root.style.setProperty("--sheet-bg", rgbToHex(sheetMix.r, sheetMix.g, sheetMix.b));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.primary);

  return colors;
}

export function isCustomPreset(presetId) {
  return presetId === CUSTOM_PRESET_ID;
}

export { CUSTOM_PRESET_ID };
