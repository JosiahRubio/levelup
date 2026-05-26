/**
 * Subscription tiers and free-plan limits.
 */

export const FREE_PLAN_FEATURES = [
  "1 focus session per day",
  "Basic timer only",
  "No badges or achievements",
  "No stats history",
];

export const PRO_PLAN_FEATURES = [
  "Unlimited focus sessions",
  "Guardrails & discipline telemetry",
  "Badges, XP ranks & stats history",
  "Full training log & money tracking",
];

/** @param {boolean} isPro */
export function isFreePlan(isPro) {
  return !isPro;
}

/** @param {{ freeFocusSessionUsed?: boolean }} day */
export function canStartFreeFocusSession(isPro, day) {
  if (isPro) return true;
  return !day.freeFocusSessionUsed;
}
