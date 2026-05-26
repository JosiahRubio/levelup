/** Dashboard widgets — stats, quotes, and daily XP progress. */

import { getDailyChallenges } from "./challenges.js";
import { MICRO_XP } from "./gamify.js";
import { xpForDayCompletion } from "./logic.js";

/** Target XP for the daily progress widget. */
export const DAILY_XP_GOAL = 50;

const QUOTES = [
  "Small steps compound into elite habits.",
  "Discipline is choosing what you want most over what you want now.",
  "Show up today; your future self is watching.",
  "Focus is a skill you build one session at a time.",
  "Consistency beats intensity when intensity fades.",
  "You do not need motivation — you need a system.",
  "Win the morning and the day bends your way.",
  "Progress is quiet until it is undeniable.",
  "Train the body, sharpen the mind, protect the streak.",
  "One honest rep beats a hundred excuses.",
  "Rest is part of the work when it is intentional.",
  "Your standards become your ceiling or your floor.",
  "Energy follows action more often than the reverse.",
  "Guardrails exist so you do not negotiate with yourself.",
  "The scoreboard resets every sunrise.",
  "Depth beats distraction every single time.",
  "Earn your confidence in private.",
  "A clear goal turns effort into momentum.",
  "You are one focused block away from momentum.",
  "Stack wins until they feel normal.",
  "Pressure reveals habits — build good ones early.",
  "The work you avoid is usually the work that matters.",
  "Stay patient with results and impatient with effort.",
  "Excellence is a direction, not a destination.",
  "Protect your attention like it pays rent.",
  "Finish what you start today.",
  "Calm effort outlasts frantic bursts.",
  "Your streak is proof you keep promises to yourself.",
  "Level up by degrees, not by drama.",
  "Make today count twice — train and reflect.",
];

function seedFromIso(iso) {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable inspirational quote for a calendar day. */
export function quoteForDay(iso) {
  const idx = seedFromIso(iso) % QUOTES.length;
  return QUOTES[idx];
}

/** XP credited today from micro actions, quests, and day completion sync. */
export function xpEarnedToday(state, iso) {
  const day = state.dailyByDate?.[iso];
  if (!day) return 0;

  let xp = 0;
  const micro = day.microXpSynced ?? {};
  for (const [key, synced] of Object.entries(micro)) {
    if (!synced) continue;
    const amount = MICRO_XP[/** @type {keyof typeof MICRO_XP} */ (key)];
    if (typeof amount === "number") xp += amount;
  }

  const syncedCh = state.challengeXpSyncedByDate?.[iso] ?? {};
  for (const ch of getDailyChallenges(iso)) {
    if (syncedCh[ch.dayKey]) xp += ch.xp;
  }

  if (day.xpSyncedForDate === iso) {
    xp += xpForDayCompletion(!!state.isPro);
  }

  return xp;
}

/** Lifetime activity: days with workout or focus goal met, plus total focus seconds. */
export function lifetimeActivityStats(state) {
  let sessions = 0;
  let focusSec = 0;
  for (const day of Object.values(state.dailyByDate ?? {})) {
    if (!day || typeof day !== "object") continue;
    const accum = Math.max(0, Number(day.focusAccumSec) || 0);
    const target = Math.max(1, Number(day.focusTargetSec) || 25 * 60);
    focusSec += accum;
    if (day.workoutComplete || accum >= target) sessions += 1;
  }
  return { sessions, focusSec };
}

/** @param {number} totalSec */
export function formatFocusDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "0m";
}
