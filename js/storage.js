import { defaultThemeState, normalizeThemeState } from "./theme.js";
import { defaultAchievementStats, normalizeAchievementStats } from "./achievements.js";
import { isoLocalDate } from "./date.js";

export { isoLocalDate };

const STORAGE_KEY = "levelup_v1";

/** Max notifications kept in the inbox; oldest are pruned past this. */
export const MAX_NOTIFICATIONS = 50;

function uid() {
  return crypto.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;
}

function normalizeNotifications(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n === "object")
    .map((n) => ({
      id: typeof n.id === "string" && n.id ? n.id : uid(),
      type: typeof n.type === "string" ? n.type.slice(0, 24) : "info",
      title: String(n.title ?? "").slice(0, 120),
      body: String(n.body ?? "").slice(0, 240),
      icon: typeof n.icon === "string" ? n.icon.slice(0, 32) : "bell",
      ts: Number.isFinite(n.ts) ? n.ts : Date.now(),
      read: !!n.read,
    }))
    .slice(-MAX_NOTIFICATIONS);
}

export function defaultState() {
  return {
    userId: "",
    userEmail: "",
    displayName: "",
    onboardingComplete: false,
    avatarIcon: "users",
    preferences: {
      notifications: true,
      sound: true,
    },
    isPro: false,
    subscribedAnnual: false,
    physiqueGoal: "lean",
    programWeek: 1,
    bodyWeights: [],
    habitLabels: ["Sleep routine", "Deep work block", "Protein goal"],
    dopamineRestrictions: [
      { id: uid(), label: "Avoid aimless scrolling" },
      { id: uid(), label: "Avoid cheap dopamine loops" },
    ],
    money: {
      monthlyIncomeGoal: 4000,
      weeklyHoursTarget: 25,
    },
    xpTotal: 0,
    quests: [],
    challengeCompletionsByDate: {},
    challengeXpSyncedByDate: {},
    achievementsUnlocked: [],
    achievementUnlockDates: {},
    achievementStats: defaultAchievementStats(),
    achievementNotifiedCount: 0,
    notifications: [],
    nudgeLog: {},
    lastCelebratedRankKey: null,
    focusGuideDismissed: false,
    dayQualifiedByDate: {},
    dailyByDate: {},
    theme: defaultThemeState(),
    createdAt: new Date().toISOString(),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return defaultState();
  }
}

const ACHIEVEMENT_KEY_ALIASES = {
  rank_soldier: "rank_pro",
  rank_apex: "rank_elite",
};

function migrateAchievementKeys(raw, fallback) {
  if (!Array.isArray(raw)) return fallback;
  const out = new Set();
  for (const k of raw) {
    if (typeof k !== "string") continue;
    out.add(ACHIEVEMENT_KEY_ALIASES[k] ?? k);
  }
  return [...out];
}

export function migrateState(parsed) {
  const base = defaultState();
  return {
    ...base,
    ...parsed,
    money: { ...base.money, ...(parsed.money ?? {}) },
    dopamineRestrictions: Array.isArray(parsed.dopamineRestrictions)
      ? parsed.dopamineRestrictions
      : base.dopamineRestrictions,
    habitLabels:
      Array.isArray(parsed.habitLabels) && parsed.habitLabels.length === 3
        ? parsed.habitLabels
        : base.habitLabels,
    dailyByDate: typeof parsed.dailyByDate === "object" && parsed.dailyByDate !== null ? parsed.dailyByDate : {},
    dayQualifiedByDate:
      typeof parsed.dayQualifiedByDate === "object" && parsed.dayQualifiedByDate !== null
        ? parsed.dayQualifiedByDate
        : {},
    quests: Array.isArray(parsed.quests)
      ? parsed.quests
          .filter((q) => q && typeof q === "object")
          .map((q) => ({
            id: typeof q.id === "string" && q.id ? q.id : uid(),
            text: String(q.text ?? "").slice(0, 200),
            done: !!q.done,
          }))
      : base.quests,
    challengeCompletionsByDate:
      typeof parsed.challengeCompletionsByDate === "object" && parsed.challengeCompletionsByDate !== null
        ? parsed.challengeCompletionsByDate
        : base.challengeCompletionsByDate,
    challengeXpSyncedByDate:
      typeof parsed.challengeXpSyncedByDate === "object" && parsed.challengeXpSyncedByDate !== null
        ? parsed.challengeXpSyncedByDate
        : base.challengeXpSyncedByDate,
    achievementsUnlocked: migrateAchievementKeys(parsed.achievementsUnlocked, base.achievementsUnlocked),
    achievementUnlockDates:
      typeof parsed.achievementUnlockDates === "object" && parsed.achievementUnlockDates !== null
        ? parsed.achievementUnlockDates
        : base.achievementUnlockDates,
    achievementStats: normalizeAchievementStats(parsed.achievementStats ?? base.achievementStats),
    achievementNotifiedCount: Math.max(0, Number(parsed.achievementNotifiedCount) || 0),
    notifications: normalizeNotifications(parsed.notifications),
    nudgeLog:
      typeof parsed.nudgeLog === "object" && parsed.nudgeLog !== null ? parsed.nudgeLog : {},
    lastCelebratedRankKey:
      typeof parsed.lastCelebratedRankKey === "string" ? parsed.lastCelebratedRankKey : base.lastCelebratedRankKey,
    focusGuideDismissed: !!(parsed.focusGuideDismissed ?? base.focusGuideDismissed),
    userId: typeof parsed.userId === "string" ? parsed.userId.slice(0, 64) : base.userId,
    userEmail: typeof parsed.userEmail === "string" ? parsed.userEmail.trim().slice(0, 120) : base.userEmail,
    displayName:
      typeof parsed.displayName === "string" ? parsed.displayName.trim().slice(0, 40) : base.displayName,
    onboardingComplete:
      typeof parsed.onboardingComplete === "boolean"
        ? parsed.onboardingComplete
        : true,
    avatarIcon:
      typeof parsed.avatarIcon === "string" && parsed.avatarIcon.length > 0
        ? parsed.avatarIcon.slice(0, 32)
        : base.avatarIcon,
    preferences: {
      ...base.preferences,
      ...(typeof parsed.preferences === "object" && parsed.preferences !== null ? parsed.preferences : {}),
      notifications: !!(parsed.preferences?.notifications ?? base.preferences.notifications),
      sound: !!(parsed.preferences?.sound ?? base.preferences.sound),
    },
    theme: normalizeThemeState(parsed.theme ?? base.theme),
  };
}

/** @type {Set<(state: object) => void>} */
const afterSaveListeners = new Set();

/** Subscribe to local saves (used by sync.js to schedule pushes). */
export function onAfterSave(fn) {
  afterSaveListeners.add(fn);
  return () => afterSaveListeners.delete(fn);
}

/** Persist app data locally (offline cache). Sync layer pushes it to Supabase. */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota or privacy errors */
  }
  for (const fn of afterSaveListeners) {
    try {
      fn(state);
    } catch (err) {
      console.error("onAfterSave listener failed:", err);
    }
  }
}

export function normalizeDayRecord(day) {
  const habits = Array.isArray(day.habits) ? [...day.habits] : [];
  while (habits.length < 3) habits.push(false);
  day.habits = habits.slice(0, 3);

  if (!Array.isArray(day.exercises) || !day.exercises.length) {
    day.exercises = defaultExercisesSnapshot();
  }

  const segmentStart = day.focusSegmentStartTs ?? day.focusStartedAt ?? null;
  day.focusSegmentStartTs = typeof segmentStart === "number" ? segmentStart : null;
  day.focusStartedAt = day.focusSegmentStartTs;

  if (typeof day.focusTargetSec !== "number" || day.focusTargetSec <= 0) {
    day.focusTargetSec = 25 * 60;
  }
  if (typeof day.focusAccumSec !== "number" || day.focusAccumSec < 0) {
    day.focusAccumSec = 0;
  }
  if (typeof day.dopamineById !== "object" || day.dopamineById === null) {
    day.dopamineById = {};
  }
  if (typeof day.microXpSynced !== "object" || day.microXpSynced === null) {
    day.microXpSynced = {};
  }
  day.freeFocusSessionUsed = !!day.freeFocusSessionUsed;
  return day;
}

export function blankDay(previous) {
  const base = previous ?? {};
  return normalizeDayRecord({
    workoutNote: base.workoutNote ?? "",
    workoutComplete: !!base.workoutComplete,
    exercises: Array.isArray(base.exercises) ? base.exercises : defaultExercisesSnapshot(),
    habits: Array.isArray(base.habits) ? [...base.habits] : [false, false, false],
    dopamineById:
      typeof base.dopamineById === "object" && base.dopamineById !== null
        ? { ...base.dopamineById }
        : {},
    focusTargetSec: typeof base.focusTargetSec === "number" ? base.focusTargetSec : 25 * 60,
    focusAccumSec: typeof base.focusAccumSec === "number" ? base.focusAccumSec : 0,
    focusRunning: !!base.focusRunning,
    focusSegmentStartTs:
      typeof base.focusSegmentStartTs === "number"
        ? base.focusSegmentStartTs
        : typeof base.focusStartedAt === "number"
          ? base.focusStartedAt
          : null,
    focusStartedAt: null,
    workHours: typeof base.workHours === "number" ? base.workHours : 0,
    incomeToday: typeof base.incomeToday === "number" ? base.incomeToday : 0,
    xpSyncedForDate: null,
    disciplineSnapshot: typeof base.disciplineSnapshot === "number" ? base.disciplineSnapshot : null,
    workoutStatCounted: !!base.workoutStatCounted,
    focusDayStatCounted: !!base.focusDayStatCounted,
    freeFocusSessionUsed: !!base.freeFocusSessionUsed,
    microXpSynced:
      typeof base.microXpSynced === "object" && base.microXpSynced !== null
        ? { ...base.microXpSynced }
        : {},
  });
}

function defaultExercisesSnapshot() {
  return [
    { id: uid(), name: "Compound lift — primary", sets: 4, reps: 6, weight: 0 },
    { id: uid(), name: "Secondary movement", sets: 3, reps: 10, weight: 0 },
    { id: uid(), name: "Core / carry", sets: 3, reps: 12, weight: 0 },
  ];
}

export function getDay(state, iso) {
  if (!state.dailyByDate[iso]) state.dailyByDate[iso] = blankDay();
  state.dailyByDate[iso] = normalizeDayRecord(state.dailyByDate[iso]);
  return state.dailyByDate[iso];
}

export function pruneOldDays(state, keepDays = 120) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffIso = isoLocalDate(cutoff);
  for (const k of Object.keys(state.dailyByDate)) {
    if (k < cutoffIso) {
      delete state.dailyByDate[k];
      delete state.dayQualifiedByDate[k];
    }
  }
}
