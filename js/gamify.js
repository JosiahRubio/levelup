import { pillarFractions } from "./logic.js";
import { todayChallengesDone } from "./challenges.js";

/** Small XP grants for everyday actions (revoked if unchecked). */
export const MICRO_XP = {
  habit: 5,
  workout: 10,
  guardrail: 3,
  focus: 15,
};

/** @param {object} state @param {string} iso @param {number} restrictionCount */
export function dailyProgressPercent(state, iso, restrictionCount) {
  const day = state.dailyByDate?.[iso] ?? {};
  const p = pillarFractions(day, restrictionCount);
  const questPart = todayChallengesDone(state, iso) / 3;
  const pillarParts = [p.workout, p.habits, p.focusMet, p.money];
  if (restrictionCount > 0) pillarParts.push(p.dopDone);
  const pillarPart =
    pillarParts.reduce((a, x) => a + x, 0) / Math.max(1, pillarParts.length);
  return Math.round(((questPart + pillarPart) / 2) * 100);
}

/** @param {number} xp @param {{ nextAt: number | null; prevAt: number }} rank */
export function rankProgressPercent(xp, rank) {
  if (rank.nextAt === null) return 100;
  const span = Math.max(1, rank.nextAt - (rank.prevAt ?? 0));
  return Math.min(100, Math.round(((xp - (rank.prevAt ?? 0)) / span) * 100));
}

export function ensureMicroXpMap(day) {
  if (!day.microXpSynced || typeof day.microXpSynced !== "object") {
    day.microXpSynced = {};
  }
  return day.microXpSynced;
}

/** @returns {number} XP granted (0 if already synced) */
export function grantMicroXp(state, day, key, amount) {
  const map = ensureMicroXpMap(day);
  if (map[key]) return 0;
  map[key] = true;
  state.xpTotal = (state.xpTotal ?? 0) + amount;
  return amount;
}

export function revokeMicroXp(state, day, key, amount) {
  const map = ensureMicroXpMap(day);
  if (!map[key]) return;
  delete map[key];
  state.xpTotal = Math.max(0, (state.xpTotal ?? 0) - amount);
}
