import { isoLocalDate } from "./date.js";

export function pillarFractions(day, restrictionCount) {
  const workout = day.workoutComplete ? 1 : 0;
  const habitsDone = (day.habits ?? []).filter(Boolean).length;
  const habits = habitsDone / 3;
  const focusMet = day.focusAccumSec >= day.focusTargetSec ? 1 : 0;
  const money =
    (Number(day.workHours) > 0 || Number(day.incomeToday) > 0) && !Number.isNaN(Number(day.workHours))
      ? 1
      : 0;
  const dopDone = restrictionCount
    ? Object.values(day.dopamineById ?? {}).filter(Boolean).length / restrictionCount
    : 1;
  return { workout, habits, focusMet, money, dopDone };
}

export function disciplineScore(day, restrictionCount) {
  const p = pillarFractions(day, restrictionCount);
  const raw =
    p.workout * 0.22 +
    p.habits * 0.28 +
    p.focusMet * 0.22 +
    p.money * 0.18 +
    p.dopDone * 0.1;
  return Math.round(Math.min(1, Math.max(0, raw)) * 100);
}

export function dayQualified(day, restrictionCount) {
  const p = pillarFractions(day, restrictionCount);
  return (
    p.workout >= 1 &&
    p.habits >= 1 &&
    p.focusMet >= 1 &&
    p.money >= 1 &&
    p.dopDone >= 1
  );
}

export function xpForDayCompletion(isPro = true) {
  return isPro ? 50 : 25;
}

export function rankFromXp(xp) {
  /** @typedef {{ key: string; label: string; min: number; max: number | null }} Tier */
  /** @type {Tier[]} */
  const tiers = [
    { key: "beginner", label: "Beginner", min: 0, max: 500 },
    { key: "pro", label: "Pro", min: 500, max: 2500 },
    { key: "elite", label: "Elite", min: 2500, max: null },
  ];

  /** @type {Tier} */
  let current = tiers.at(-1) ?? tiers[0];
  for (const tier of tiers) {
    if (tier.max === null) {
      current = tier;
      break;
    }
    if (xp < tier.max) {
      current = tier;
      break;
    }
  }

  return { ...current, nextAt: current.max, prevAt: current.min };
}

export function streakCount(dayQualifiedByDate) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let streak = 0;
  while (dayQualifiedByDate[isoLocalDate(d)]) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function monthIncomeProgress(monthEntries) {
  const sum = monthEntries.reduce((a, x) => a + Number(x.income ?? 0), 0);
  return sum;
}

export function weekHoursProgress(weekEntries) {
  const sum = weekEntries.reduce((a, x) => a + Number(x.workHours ?? 0), 0);
  return sum;
}

export function isoWeekMonday(isoDate) {
  const [y, m, dd] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, dd);
  const day = dt.getDay(); // Sun 0
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(dt);
  monday.setDate(monday.getDate() - mondayOffset);
  return isoLocalDate(monday);
}

export function weekDatesFrom(isoMonday) {
  const [y, m, dd] = isoMonday.split("-").map(Number);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(y, m - 1, dd + i);
    out.push(isoLocalDate(d));
  }
  return out;
}

export function monthDatesFrom(isoDate) {
  const [y, m] = isoDate.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const dates = [];
  for (let d = 1; d <= last; d++) {
    dates.push(`${y}-${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`);
  }
  return dates;
}
