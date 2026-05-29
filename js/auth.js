/**
 * Auth backed by Supabase. Session lives in supabase-js storage; we cache it
 * in-memory after `initSession()` so the rest of the app can ask synchronously.
 */

import { supabase } from "./supabase.js";
import { defaultState, loadState, migrateState } from "./storage.js";

const STATE_KEY = "levelup_v1";

/** @type {import("https://esm.sh/@supabase/supabase-js@2").Session | null} */
let cachedSession = null;

let authSubscription = null;
/** @type {Set<() => void>} */
const authListeners = new Set();

function notifyAuthChange() {
  for (const fn of authListeners) {
    try {
      fn();
    } catch (err) {
      console.error("Auth listener failed:", err);
    }
  }
}

/** Subscribe to sign-in/out events. Returns an unsubscribe fn. */
export function onAuthChange(fn) {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

/** Resolve the current Supabase session and start tracking auth state. */
export async function initSession() {
  const { data } = await supabase.auth.getSession();
  cachedSession = data.session ?? null;
  if (!authSubscription) {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      cachedSession = session ?? null;
      if (event === "SIGNED_OUT") {
        try {
          localStorage.removeItem(STATE_KEY);
        } catch {
          /* ignore */
        }
      }
      notifyAuthChange();
    });
    authSubscription = sub.subscription;
  }
  return cachedSession;
}

export function hasSession() {
  return !!cachedSession;
}

export function currentUserId() {
  return cachedSession?.user?.id ?? null;
}

export function currentUserEmail() {
  return cachedSession?.user?.email ?? null;
}

function applySessionFields(state) {
  const u = cachedSession?.user;
  if (!u) return state;
  state.userId = u.id;
  state.userEmail = u.email ?? state.userEmail ?? "";
  const meta = u.user_metadata ?? {};
  if (typeof meta.display_name === "string" && meta.display_name) {
    state.displayName = meta.display_name;
  }
  state.onboardingComplete = true;
  return state;
}

/**
 * Synchronous local-cache hydrator used at boot. The server pull happens
 * separately in sync.js and overwrites this once it lands.
 */
export function initAppState() {
  if (!cachedSession) return defaultState();
  let state;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    state = raw ? migrateState(JSON.parse(raw)) : defaultState();
  } catch {
    state = defaultState();
  }
  // If localStorage belongs to a different account, drop it.
  if (state.userId && state.userId !== cachedSession.user.id) {
    state = defaultState();
  }
  return applySessionFields(state);
}

/**
 * @param {{ name: string; email: string; password: string }} creds
 */
export async function registerNewUser(creds) {
  const { data, error } = await supabase.auth.signUp({
    email: creds.email,
    password: creds.password,
    options: { data: { display_name: creds.name } },
  });
  if (error) throw error;
  cachedSession = data.session ?? null;
  const state = applySessionFields(defaultState());
  state.displayName = creds.name;
  state.userEmail = creds.email;
  return { state, session: cachedSession };
}

/**
 * @param {{ email: string; password: string }} creds
 */
export async function signInUser(creds) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (error) throw error;
  cachedSession = data.session;
  return { session: cachedSession };
}

/** @param {{ name?: string; email?: string }} patch */
export async function updateSessionProfile(patch) {
  if (!cachedSession?.user) return;
  /** @type {Record<string, unknown>} */
  const metaUpdate = {};
  if (typeof patch.name === "string") {
    metaUpdate.display_name = patch.name.trim().slice(0, 40);
  }
  if (Object.keys(metaUpdate).length) {
    await supabase.auth.updateUser({ data: metaUpdate });
    await supabase
      .from("profiles")
      .update({ display_name: metaUpdate.display_name })
      .eq("id", cachedSession.user.id);
  }
  if (typeof patch.email === "string") {
    await supabase.auth.updateUser({ email: patch.email.trim().toLowerCase() });
  }
}

/** Sign out of Supabase and wipe local app data. */
export async function signOutAndClearData() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Supabase signOut failed:", err);
  }
  cachedSession = null;
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}
