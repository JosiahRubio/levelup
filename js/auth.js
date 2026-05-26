/**
 * Local session — keeps users signed in until they log out.
 * App data (levelup_v1) is only loaded when a valid session exists.
 */

import { defaultState, saveState, loadState, migrateState } from "./storage.js";

const SESSION_KEY = "levelup_session";
const STORAGE_KEY = "levelup_v1";

function uid() {
  return crypto.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;
}

/** @typedef {{ userId: string; name: string; email: string; passwordHash: string; createdAt: string }} UserSession */

/** @returns {UserSession | null} */
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.userId !== "string" || !parsed.userId) return null;
    if (typeof parsed.name !== "string" || typeof parsed.email !== "string") return null;
    if (typeof parsed.passwordHash !== "string" || !parsed.passwordHash) return null;
    return {
      userId: parsed.userId,
      name: parsed.name.slice(0, 40),
      email: parsed.email.slice(0, 120),
      passwordHash: parsed.passwordHash,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** @param {UserSession} session */
export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasSession() {
  return loadSession() !== null;
}

/** @param {string} password */
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** @param {UserSession} session */
function applySessionToState(session, state) {
  state.userId = session.userId;
  state.displayName = session.name;
  state.userEmail = session.email;
  state.onboardingComplete = true;
}

/** One-time: existing installs without a session file. */
function migrateLegacySession(parsed) {
  return {
    userId: typeof parsed.userId === "string" && parsed.userId ? parsed.userId : uid(),
    name: String(parsed.displayName ?? "").trim().slice(0, 40) || "Member",
    email: String(parsed.userEmail ?? "").trim().slice(0, 120) || "member@local.app",
    passwordHash: "legacy-no-password",
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
  };
}

/**
 * Load persisted app state only when signed in; otherwise return fresh guest state
 * that is never read from another user's localStorage data.
 */
export function initAppState() {
  let session = loadSession();

  if (!session) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.onboardingComplete) {
          session = migrateLegacySession(parsed);
          saveSession(session);
          const state = migrateState(parsed);
          applySessionToState(session, state);
          return state;
        }
      }
    } catch {
      /* guest */
    }
    return defaultState();
  }

  const state = loadState();
  if (state.userId && state.userId !== session.userId) {
    const fresh = defaultState();
    applySessionToState(session, fresh);
    saveState(fresh);
    return fresh;
  }
  applySessionToState(session, state);
  return state;
}

/**
 * @param {{ name: string; email: string; password: string }} creds
 */
export async function registerNewUser(creds) {
  const passwordHash = await hashPassword(creds.password);
  const session = {
    userId: uid(),
    name: creds.name,
    email: creds.email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  const state = defaultState();
  applySessionToState(session, state);
  saveSession(session);
  saveState(state);
  return { session, state };
}

/** @param {{ name?: string; email?: string }} patch */
export function updateSessionProfile(patch) {
  const session = loadSession();
  if (!session) return;
  if (typeof patch.name === "string") session.name = patch.name.trim().slice(0, 40);
  if (typeof patch.email === "string") session.email = patch.email.trim().toLowerCase().slice(0, 120);
  saveSession(session);
}

/** Wipe session and all app data for a clean start. */
export function signOutAndClearData() {
  clearSession();
  localStorage.removeItem(STORAGE_KEY);
}
