import { streakCount } from "./logic.js";
import { countTotalChallengeCompletions, todayChallengesDone } from "./challenges.js";
import { isoLocalDate } from "./date.js";

/** @typedef {{ current: number; target: number }} AchievementProgress */
/** @typedef {{ key: string; title: string; desc: string; icon: string; category: string; xpBonus: number; test: (ctx: AchievementContext) => boolean; progress?: (ctx: AchievementContext) => AchievementProgress }} AchievementDef */
/** @typedef {ReturnType<typeof buildAchievementContext>} AchievementContext */

/** @type {AchievementDef[]} */
export const ACHIEVEMENTS = [
  {
    key: "first_login",
    title: "First Login",
    desc: "Open LevelUp for the first time",
    icon: "hand",
    category: "Getting started",
    xpBonus: 15,
    progress: (c) => ({ current: Math.min(1, c.appOpens), target: 1 }),
    test: (c) => c.appOpens >= 1,
  },
  {
    key: "first_xp",
    title: "First XP",
    desc: "Earn your first experience point",
    icon: "star",
    category: "Progress",
    xpBonus: 25,
    progress: (c) => ({ current: Math.min(1, c.xpTotal), target: 1 }),
    test: (c) => c.xpTotal >= 1,
  },
  {
    key: "streak_3",
    title: "On a Roll",
    desc: "Hit a 3-day qualified streak",
    icon: "flame",
    category: "Streaks",
    xpBonus: 50,
    progress: (c) => ({ current: Math.min(3, c.streak), target: 3 }),
    test: (c) => c.streak >= 3,
  },
  {
    key: "streak_7",
    title: "7-Day Streak",
    desc: "Stay qualified seven days in a row",
    icon: "trophy",
    category: "Streaks",
    xpBonus: 100,
    progress: (c) => ({ current: Math.min(7, c.streak), target: 7 }),
    test: (c) => c.streak >= 7,
  },
  {
    key: "streak_30",
    title: "Iron Month",
    desc: "Maintain a 30-day qualified streak",
    icon: "crown",
    category: "Streaks",
    xpBonus: 500,
    progress: (c) => ({ current: Math.min(30, c.streak), target: 30 }),
    test: (c) => c.streak >= 30,
  },
  {
    key: "perfect_day",
    title: "Perfect Day",
    desc: "Complete all three daily challenges today",
    icon: "sparkles",
    category: "Quests",
    xpBonus: 30,
    progress: (c) => ({ current: Math.min(3, c.todayChallengesDone), target: 3 }),
    test: (c) => c.todayChallengesDone >= 3,
  },
  {
    key: "challenges_10",
    title: "Quest Slayer",
    desc: "Finish 10 daily challenges (lifetime)",
    icon: "swords",
    category: "Quests",
    xpBonus: 75,
    progress: (c) => ({ current: Math.min(10, c.totalChallengesEver), target: 10 }),
    test: (c) => c.totalChallengesEver >= 10,
  },
  {
    key: "side_quest_5",
    title: "Side Quest Hero",
    desc: "Complete 5 custom side quests",
    icon: "scrollText",
    category: "Quests",
    xpBonus: 40,
    progress: (c) => ({ current: Math.min(5, c.sideQuestsCompleted), target: 5 }),
    test: (c) => c.sideQuestsCompleted >= 5,
  },
  {
    key: "workout_10",
    title: "Gym Regular",
    desc: "Log 10 completed workouts",
    icon: "dumbbell",
    category: "Training",
    xpBonus: 60,
    progress: (c) => ({ current: Math.min(10, c.workoutsCompleted), target: 10 }),
    test: (c) => c.workoutsCompleted >= 10,
  },
  {
    key: "focus_5",
    title: "Deep Focus",
    desc: "Hit your focus target on 5 separate days",
    icon: "target",
    category: "Discipline",
    xpBonus: 55,
    progress: (c) => ({ current: Math.min(5, c.focusDaysMet), target: 5 }),
    test: (c) => c.focusDaysMet >= 5,
  },
  {
    key: "discipline_90",
    title: "Discipline Ace",
    desc: "Score 90+ on the daily discipline board",
    icon: "shieldCheck",
    category: "Discipline",
    xpBonus: 45,
    progress: (c) => ({ current: Math.min(90, c.bestDisciplineScore), target: 90 }),
    test: (c) => c.bestDisciplineScore >= 90,
  },
  {
    key: "power_user",
    title: "Power User",
    desc: "Open the app 10 times and explore 5 screens",
    icon: "zap",
    category: "Engagement",
    xpBonus: 80,
    progress: (c) => ({
      current: Math.min(10, c.appOpens) + Math.min(5, c.viewsVisitedCount),
      target: 15,
    }),
    test: (c) => c.appOpens >= 10 && c.viewsVisitedCount >= 5,
  },
  {
    key: "rank_pro",
    title: "Pro rank",
    desc: "Reach Pro level (500 XP)",
    icon: "medal",
    category: "Ranks",
    xpBonus: 0,
    progress: (c) => ({ current: Math.min(500, c.xpTotal), target: 500 }),
    test: (c) => c.xpTotal >= 500,
  },
  {
    key: "rank_elite",
    title: "Elite rank",
    desc: "Reach Elite level (2500 XP)",
    icon: "gem",
    category: "Ranks",
    xpBonus: 0,
    progress: (c) => ({ current: Math.min(2500, c.xpTotal), target: 2500 }),
    test: (c) => c.xpTotal >= 2500,
  },
  {
    key: "streak_100",
    title: "Centurion",
    desc: "Maintain a 100-day qualified streak",
    icon: "rocket",
    category: "Streaks",
    xpBonus: 2000,
    progress: (c) => ({ current: Math.min(100, c.streak), target: 100 }),
    test: (c) => c.streak >= 100,
  },
  {
    key: "first_workout",
    title: "First Rep",
    desc: "Log your very first completed workout",
    icon: "activity",
    category: "Training",
    xpBonus: 20,
    progress: (c) => ({ current: Math.min(1, c.workoutsCompleted), target: 1 }),
    test: (c) => c.workoutsCompleted >= 1,
  },
  {
    key: "workout_50",
    title: "Iron Will",
    desc: "Log 50 completed workouts",
    icon: "heart",
    category: "Training",
    xpBonus: 400,
    progress: (c) => ({ current: Math.min(50, c.workoutsCompleted), target: 50 }),
    test: (c) => c.workoutsCompleted >= 50,
  },
  {
    key: "focus_20",
    title: "Focus Marathon",
    desc: "Hit your focus target on 20 separate days",
    icon: "brain",
    category: "Discipline",
    xpBonus: 175,
    progress: (c) => ({ current: Math.min(20, c.focusDaysMet), target: 20 }),
    test: (c) => c.focusDaysMet >= 20,
  },
  {
    key: "login_30",
    title: "Dedicated",
    desc: "Open the app on 30 different calendar days",
    icon: "sun",
    category: "Engagement",
    xpBonus: 250,
    progress: (c) => ({ current: Math.min(30, c.loginDaysCount), target: 30 }),
    test: (c) => c.loginDaysCount >= 30,
  },
];

export function defaultAchievementStats() {
  return {
    appOpens: 0,
    loginDays: [],
    viewsVisited: {},
    workoutsCompleted: 0,
    focusDaysMet: 0,
    sideQuestsCompleted: 0,
    bestDisciplineScore: 0,
    peakFocusMinutes: 0,
  };
}

export function normalizeAchievementStats(raw) {
  const base = defaultAchievementStats();
  if (!raw || typeof raw !== "object") return base;
  const loginDays = Array.isArray(raw.loginDays)
    ? [...new Set(raw.loginDays.filter((d) => typeof d === "string"))].slice(0, 400)
    : base.loginDays;
  const viewsVisited =
    typeof raw.viewsVisited === "object" && raw.viewsVisited !== null ? { ...raw.viewsVisited } : base.viewsVisited;
  return {
    appOpens: Math.max(0, Number(raw.appOpens) || 0),
    loginDays,
    viewsVisited,
    workoutsCompleted: Math.max(0, Number(raw.workoutsCompleted) || 0),
    focusDaysMet: Math.max(0, Number(raw.focusDaysMet) || 0),
    sideQuestsCompleted: Math.max(0, Number(raw.sideQuestsCompleted) || 0),
    bestDisciplineScore: Math.max(0, Math.min(100, Number(raw.bestDisciplineScore) || 0)),
    peakFocusMinutes: Math.max(0, Number(raw.peakFocusMinutes) || 0),
  };
}

export function ensureAchievementStats(state) {
  if (!state.achievementStats) state.achievementStats = defaultAchievementStats();
  return state.achievementStats;
}

/** Call once per app load / session. */
export function recordAppSession(state) {
  const stats = ensureAchievementStats(state);
  stats.appOpens += 1;
  const iso = isoLocalDate();
  if (!stats.loginDays.includes(iso)) stats.loginDays.push(iso);
}

/** Track screen exploration for Power User. */
export function recordViewVisit(state, viewKey) {
  if (!viewKey) return;
  const stats = ensureAchievementStats(state);
  stats.viewsVisited[viewKey] = true;
}

export function bumpWorkoutCompleted(state) {
  ensureAchievementStats(state).workoutsCompleted += 1;
}

export function bumpSideQuestCompleted(state) {
  ensureAchievementStats(state).sideQuestsCompleted += 1;
}

export function recordFocusDayMet(state, minutes) {
  const stats = ensureAchievementStats(state);
  stats.focusDaysMet += 1;
  stats.peakFocusMinutes = Math.max(stats.peakFocusMinutes, minutes);
}

export function recordDisciplineScore(state, score) {
  const stats = ensureAchievementStats(state);
  stats.bestDisciplineScore = Math.max(stats.bestDisciplineScore, score);
}

function countWorkoutsFromDays(state) {
  let n = 0;
  for (const day of Object.values(state.dailyByDate ?? {})) {
    if (day?.workoutComplete) n += 1;
  }
  return n;
}

function countFocusDaysFromDays(state) {
  let n = 0;
  for (const day of Object.values(state.dailyByDate ?? {})) {
    if (!day) continue;
    const target = Number(day.focusTargetSec) || 25 * 60;
    if (Number(day.focusAccumSec) >= target) n += 1;
  }
  return n;
}

function countSideQuestsFromState(state) {
  return (state.quests ?? []).filter((q) => q.done).length;
}

/** Sync derived counters from historical day logs. */
export function syncAchievementStatsFromHistory(state) {
  const stats = ensureAchievementStats(state);
  const workouts = countWorkoutsFromDays(state);
  const focusDays = countFocusDaysFromDays(state);
  const sideQuests = countSideQuestsFromState(state);
  stats.workoutsCompleted = Math.max(stats.workoutsCompleted, workouts);
  stats.focusDaysMet = Math.max(stats.focusDaysMet, focusDays);
  stats.sideQuestsCompleted = Math.max(stats.sideQuestsCompleted, sideQuests);
}

export function buildAchievementContext(state) {
  const iso = isoLocalDate();
  const stats = ensureAchievementStats(state);
  syncAchievementStatsFromHistory(state);
  const viewsVisitedCount = Object.keys(stats.viewsVisited).filter((k) => stats.viewsVisited[k]).length;
  return {
    state,
    iso,
    xpTotal: state.xpTotal ?? 0,
    streak: streakCount(state.dayQualifiedByDate ?? {}),
    todayChallengesDone: todayChallengesDone(state, iso),
    totalChallengesEver: countTotalChallengeCompletions(state),
    appOpens: stats.appOpens,
    loginDaysCount: stats.loginDays.length,
    viewsVisitedCount,
    workoutsCompleted: stats.workoutsCompleted,
    focusDaysMet: stats.focusDaysMet,
    sideQuestsCompleted: stats.sideQuestsCompleted,
    bestDisciplineScore: stats.bestDisciplineScore,
    peakFocusMinutes: stats.peakFocusMinutes,
  };
}

export function getAchievementProgress(ach, ctx) {
  if (typeof ach.progress === "function") return ach.progress(ctx);
  return ach.test(ctx) ? { current: 1, target: 1 } : { current: 0, target: 1 };
}

export function evaluateNewAchievements(state, ctx) {
  const unlocked = new Set(state.achievementsUnlocked ?? []);
  const fresh = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlocked.has(ach.key)) continue;
    if (ach.test(ctx)) fresh.push(ach);
  }
  return fresh;
}

export function achievementByKey(key) {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

export function isAchievementUnlocked(state, key) {
  return (state.achievementsUnlocked ?? []).includes(key);
}

export function unlockAchievement(state, ach) {
  if (!Array.isArray(state.achievementsUnlocked)) state.achievementsUnlocked = [];
  if (state.achievementsUnlocked.includes(ach.key)) return false;
  state.achievementsUnlocked.push(ach.key);
  if (!state.achievementUnlockDates || typeof state.achievementUnlockDates !== "object") {
    state.achievementUnlockDates = {};
  }
  state.achievementUnlockDates[ach.key] = new Date().toISOString();
  if (ach.xpBonus > 0) state.xpTotal = (state.xpTotal ?? 0) + ach.xpBonus;
  return true;
}

export function countUnseenAchievements(state) {
  const unlocked = state.achievementsUnlocked?.length ?? 0;
  const notified = state.achievementNotifiedCount ?? 0;
  return Math.max(0, unlocked - notified);
}
