/**
 * Sync layer: hydrate state from Supabase on boot, push debounced upserts on
 * save, and subscribe to realtime updates from other devices on the same
 * account.
 */

import { supabase } from "./supabase.js";
import { migrateState, onAfterSave } from "./storage.js";
import { currentUserId, hasSession, onAuthChange } from "./auth.js";

// Schedule a server push every time local state is saved.
onAfterSave((state) => schedulePush(state));

const PUSH_DEBOUNCE_MS = 500;

/**
 * Pushes are gated until the initial server pull completes so we don't
 * accidentally overwrite the server's existing state with a fresh-boot empty
 * defaultState. Call `enablePush()` once we've reconciled with the server.
 */
let allowPush = false;
/** @type {number | null} */
let pushTimer = null;
/** @type {object | null} */
let pendingState = null;
/** Most recent server-side updated_at we've already observed (ours or theirs). */
let lastSeenUpdatedAt = null;
/**
 * Count of in-flight pushes (incremented before upsert, decremented shortly
 * after settle). Used to suppress realtime echoes of our own writes since the
 * realtime broadcast can arrive before the upsert HTTP response.
 */
let outstandingPushes = 0;
/** Grace window after a push settles during which echoes are still likely. */
const ECHO_GRACE_MS = 750;
/** @type {import("https://esm.sh/@supabase/supabase-js@2").RealtimeChannel | null} */
let realtimeChannel = null;
/** @type {((state: object) => void) | null} */
let onIncomingState = null;

/** Register a callback for state coming in from the server (pull or realtime). */
export function setIncomingHandler(fn) {
  onIncomingState = fn;
}

/** Pull the server's stored state. Returns hydrated state or null if empty. */
export async function pullState() {
  if (!hasSession()) return null;
  const userId = currentUserId();
  const { data, error } = await supabase
    .from("app_state")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Sync pull failed:", error);
    return null;
  }
  if (!data) return null;
  lastSeenUpdatedAt = data.updated_at ?? null;
  const obj = data.state ?? {};
  if (!obj || Object.keys(obj).length === 0) return null;
  return migrateState(obj);
}

/** Allow pushes (call after the initial pull has reconciled local state). */
export function enablePush() {
  allowPush = true;
  // If anything was queued during the gated window, kick the timer now.
  if (pendingState && pushTimer == null) {
    pushTimer = window.setTimeout(async () => {
      pushTimer = null;
      const snapshot = pendingState;
      pendingState = null;
      if (snapshot) await pushState(snapshot);
    }, PUSH_DEBOUNCE_MS);
  }
}

/** Debounced push: coalesce rapid mutations into one upsert. */
export function schedulePush(state) {
  if (!hasSession()) return;
  pendingState = state;
  if (!allowPush) return; // gated until enablePush()
  if (pushTimer != null) return;
  pushTimer = window.setTimeout(async () => {
    pushTimer = null;
    const snapshot = pendingState;
    pendingState = null;
    if (snapshot) await pushState(snapshot);
  }, PUSH_DEBOUNCE_MS);
}

async function pushState(state) {
  if (!hasSession()) return;
  const userId = currentUserId();
  outstandingPushes += 1;
  try {
    const { data, error } = await supabase
      .from("app_state")
      .upsert({ user_id: userId, state }, { onConflict: "user_id" })
      .select("updated_at")
      .single();
    if (error) {
      console.error("Sync push failed:", error);
      return;
    }
    if (data?.updated_at) lastSeenUpdatedAt = data.updated_at;
  } finally {
    // Hold the suppression open briefly so the broadcast that follows the
    // HTTP response still counts as our own echo.
    setTimeout(() => {
      outstandingPushes = Math.max(0, outstandingPushes - 1);
    }, ECHO_GRACE_MS);
  }
}

/** Force any pending debounced push to land now. Use on sign-out / unload. */
export async function flushPendingPush() {
  if (pushTimer != null) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const snapshot = pendingState;
  pendingState = null;
  if (snapshot) await pushState(snapshot);
}

/** Subscribe to live updates for this user's app_state row. */
export function subscribeToChanges() {
  if (!hasSession() || realtimeChannel) return;
  const userId = currentUserId();
  realtimeChannel = supabase
    .channel(`app_state:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "app_state",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const next = payload.new;
        if (!next?.state) return;
        // Suppress self-echo: any UPDATE that arrives while we have a push
        // in-flight (or in the grace window after) is overwhelmingly likely
        // to be our own write coming back to us.
        if (outstandingPushes > 0) return;
        if (lastSeenUpdatedAt && next.updated_at <= lastSeenUpdatedAt) return;
        lastSeenUpdatedAt = next.updated_at;
        onIncomingState?.(migrateState(next.state));
      }
    )
    .subscribe();
}

export function unsubscribeFromChanges() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// Drop the realtime channel automatically when the session ends.
onAuthChange(() => {
  if (!hasSession()) unsubscribeFromChanges();
});
