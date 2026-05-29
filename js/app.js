import {
  blankDay,
  loadState,
  saveState,
  getDay,
  pruneOldDays,
  isoLocalDate,
  defaultState,
  migrateState,
  MAX_NOTIFICATIONS,
} from "./storage.js";
import {
  disciplineScore,
  dayQualified,
  pillarFractions,
  xpForDayCompletion,
  rankFromXp,
  streakCount,
  monthIncomeProgress,
  weekHoursProgress,
  isoWeekMonday,
  weekDatesFrom,
  monthDatesFrom,
} from "./logic.js";
import {
  getDailyChallenges,
  countTotalChallengeCompletions,
  todayChallengesDone,
  isChallengeDone,
} from "./challenges.js";
import {
  ACHIEVEMENTS,
  buildAchievementContext,
  evaluateNewAchievements,
  getAchievementProgress,
  unlockAchievement,
  countUnseenAchievements,
  recordAppSession,
  recordViewVisit,
  bumpWorkoutCompleted,
  bumpSideQuestCompleted,
  recordFocusDayMet,
  recordDisciplineScore,
} from "./achievements.js";
import {
  THEME_PRESETS,
  CUSTOM_PRESET_ID,
  applyTheme,
  resolveThemeColors,
} from "./theme.js";
import { NAV_ITEMS, navTabIcon } from "./nav-icons.js";
import { iconHtml, ICON, ICON_SIZE, ICON_SIZE_LG } from "./icons.js";
import {
  MICRO_XP,
  dailyProgressPercent,
  rankProgressPercent,
  grantMicroXp,
  revokeMicroXp,
} from "./gamify.js";
import {
  DAILY_XP_GOAL,
  xpEarnedToday,
  lifetimeActivityStats,
  formatFocusDuration,
} from "./widgets.js";
import {
  renderOnboarding,
  ONBOARDING_SIGNUP_STEP,
} from "./onboarding.js";
import {
  initAppState,
  initSession,
  hasSession,
  registerNewUser,
  signInUser,
  signOutAndClearData,
  updateSessionProfile,
} from "./auth.js";
import {
  pullState,
  schedulePush,
  flushPendingPush,
  subscribeToChanges,
  setIncomingHandler,
} from "./sync.js";
import { FREE_PLAN_FEATURES, PRO_PLAN_FEATURES, canStartFreeFocusSession } from "./plans.js";
import {
  showInlineError,
  clearInlineError,
  validateQuestText,
  validateDisplayName,
  validateSignupName,
  validateEmail,
  validatePassword,
  validateHabitLabel,
  validateWeeklyHoursGoal,
  validateMonthlyIncomeGoal,
  validateWorkHoursToday,
  validateIncomeToday,
  validateProgramWeek,
  validateExerciseField,
} from "./ui-feedback.js";

function migrateRankKey(key) {
  const map = { recruit: "beginner", soldier: "pro", operator: "pro", apex: "elite" };
  return map[key] ?? key;
}

function feedbackSel(attr, value) {
  const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(value)) : escapeAttr(String(value));
  return `[${attr}="${safe}"]`;
}

const CFG = typeof window !== "undefined" ? window.__LEVELUP_CONFIG__ ?? {} : {};

/** Bottom-tab destinations. */
const TAB_KEYS = ["home", "discipline", "challenges", "train", "account"];
/** Nested under You — not in the tab bar. */
const NESTED_VIEWS = ["achievements", "money", "settings", "habits", "privacy"];
const AVATAR_CYCLE = ["users", "flame", "zap", "target", "crown", "shieldCheck"];
const VIEWS = [...TAB_KEYS, ...NESTED_VIEWS];

/** @param {string} viewKey */
function tabForView(viewKey) {
  if (TAB_KEYS.includes(viewKey)) return viewKey;
  if (NESTED_VIEWS.includes(viewKey)) return "account";
  return "home";
}

/** @param {string} next */
function navigateTo(next) {
  if (!VIEWS.includes(next)) return;
  flushFocusSegment(ensureDay(isoLocalDate()));
  saveState(state);
  view = next;
  refreshTicker();
  render();
}

/** XP granted once per side quest completion (added to {@link AppState#xpTotal}). */
const QUEST_XP = 10;

/** Auto-dismiss for unobtrusive toasts (ms). */
const TOAST_DURATION_MS = 2600;
const TOAST_BRIEF_MS = 2200;
const TOAST_RESET_MS = 2000;

/** @typedef {ReturnType<typeof loadState>} AppState */

/** @type {{ id: number; type: string; title: string; body: string; icon: string; badge?: boolean }[]} */
let toastQueue = [];
let toastId = 0;

const host = {
  openSheet: false,
  openInbox: false,
  lastXpGain: 0,
  feedbackSelector: null,
  busy: false,
  /** @type {string[]} */
  recentUnlockKeys: [],
};

let state = /** @type {AppState} */ (defaultState());
let view = "home";
/** @type {number} */
let onboardingStep = 0;
/** @type {"signup" | "signin"} */
let onboardingMode = "signup";
let exitingOnboarding = false;
/** @type {number | null} */
let ticker = null;

const appEl = /** @type {HTMLElement} */ (document.getElementById("app"));

function renderOnboardingFlow() {
  if (!appEl) return;
  appEl.replaceChildren();
  appEl.classList.remove("is-loading");
  const wrap = document.createElement("div");
  wrap.innerHTML = renderOnboarding(onboardingStep, onboardingMode);
  while (wrap.firstChild) appEl.appendChild(wrap.firstChild);
  attachOnboardingHandlers(appEl);
  attachCommonHandlers(appEl);
  applyTheme(state.theme);
  if (onboardingStep >= ONBOARDING_SIGNUP_STEP) {
    const nameInput = /** @type {HTMLInputElement | null} */ (
      appEl.querySelector('[data-bind="onboarding-name"]')
    );
    nameInput?.focus();
  }
}

function attachOnboardingHandlers(root) {
  const panel = root.querySelector(".onboarding");
  if (!panel) return;
  panel.addEventListener(
    "click",
    (e) => {
      const btn = /** @type {HTMLButtonElement | null} */ (e.target.closest("button[data-action^='onboarding-']"));
      if (!btn || !panel.contains(btn) || btn.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute("data-action");
      if (action === "onboarding-skip") {
        skipToSignup();
        return;
      }
      if (action === "onboarding-back") {
        onboardingStep = Math.max(0, onboardingStep - 1);
        renderOnboardingFlow();
        return;
      }
      if (action === "onboarding-next") {
        onboardingStep = Math.min(ONBOARDING_SIGNUP_STEP, onboardingStep + 1);
        renderOnboardingFlow();
        return;
      }
      if (action === "onboarding-complete") {
        finishOnboarding();
        return;
      }
      if (action === "onboarding-signin") {
        finishSignIn();
        return;
      }
      if (action === "onboarding-mode-signin") {
        onboardingMode = "signin";
        renderOnboardingFlow();
        return;
      }
      if (action === "onboarding-mode-signup") {
        onboardingMode = "signup";
        renderOnboardingFlow();
        return;
      }
    },
    true
  );

  const onSignupEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (onboardingMode === "signin") finishSignIn();
    else finishOnboarding();
  };
  root.querySelector('[data-bind="onboarding-name"]')?.addEventListener("keydown", onSignupEnter);
  root.querySelector('[data-bind="onboarding-email"]')?.addEventListener("keydown", onSignupEnter);
  root.querySelector('[data-bind="onboarding-password"]')?.addEventListener("keydown", onSignupEnter);
}

function skipToSignup() {
  onboardingStep = ONBOARDING_SIGNUP_STEP;
  renderOnboardingFlow();
}

async function finishOnboarding() {
  if (exitingOnboarding) return;

  const nameInput = /** @type {HTMLInputElement | null} */ (
    appEl?.querySelector('[data-bind="onboarding-name"]')
  );
  const emailInput = /** @type {HTMLInputElement | null} */ (
    appEl?.querySelector('[data-bind="onboarding-email"]')
  );
  const passwordInput = /** @type {HTMLInputElement | null} */ (
    appEl?.querySelector('[data-bind="onboarding-password"]')
  );

  const nameV = validateSignupName(nameInput?.value ?? "");
  if (!nameV.ok) {
    showInlineError(nameInput, nameV.message);
    actionError("Sign up", nameV.message);
    return;
  }
  clearInlineError(nameInput);

  const emailV = validateEmail(emailInput?.value ?? "");
  if (!emailV.ok) {
    showInlineError(emailInput, emailV.message);
    actionError("Sign up", emailV.message);
    return;
  }
  clearInlineError(emailInput);

  const passV = validatePassword(passwordInput?.value ?? "");
  if (!passV.ok) {
    showInlineError(passwordInput, passV.message);
    actionError("Sign up", passV.message);
    return;
  }
  clearInlineError(passwordInput);

  exitingOnboarding = true;
  try {
    const result = await registerNewUser({
      name: nameV.value,
      email: emailV.value,
      password: passV.value,
    });
    state = result.state;
    await maybeMigrateLegacyState();
    onboardingStep = 0;
    window.location.replace("/");
  } catch (err) {
    exitingOnboarding = false;
    console.error("LevelUp sign up failed:", err);
    const msg = err instanceof Error ? err.message : "Please try again.";
    actionError("Sign up failed", msg);
  }
}

async function finishSignIn() {
  if (exitingOnboarding) return;

  const emailInput = /** @type {HTMLInputElement | null} */ (
    appEl?.querySelector('[data-bind="onboarding-email"]')
  );
  const passwordInput = /** @type {HTMLInputElement | null} */ (
    appEl?.querySelector('[data-bind="onboarding-password"]')
  );

  const emailV = validateEmail(emailInput?.value ?? "");
  if (!emailV.ok) {
    showInlineError(emailInput, emailV.message);
    actionError("Sign in", emailV.message);
    return;
  }
  clearInlineError(emailInput);

  const password = passwordInput?.value ?? "";
  if (!password) {
    showInlineError(passwordInput, "Enter your password");
    actionError("Sign in", "Enter your password");
    return;
  }
  clearInlineError(passwordInput);

  exitingOnboarding = true;
  try {
    await signInUser({ email: emailV.value, password });
    onboardingStep = 0;
    window.location.replace("/");
  } catch (err) {
    exitingOnboarding = false;
    console.error("LevelUp sign in failed:", err);
    const msg = err instanceof Error ? err.message : "Please try again.";
    actionError("Sign in failed", msg);
  }
}

/**
 * If the device has old localStorage-only data, push it to the new Supabase
 * account on first signup so the user doesn't lose progress.
 */
async function maybeMigrateLegacyState() {
  try {
    const raw = localStorage.getItem("levelup_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.onboardingComplete) return;
    if (parsed.userId && parsed.userId === state.userId) return;
    const migrated = migrateState(parsed);
    migrated.userId = state.userId;
    migrated.userEmail = state.userEmail;
    migrated.displayName = state.displayName;
    state = migrated;
    saveState(state);
    await flushPendingPush();
  } catch (err) {
    console.error("Legacy state migration failed:", err);
  }
}

function shouldShowOnboarding() {
  if (hasSession()) return false;
  return true;
}

async function bootstrap() {
  if (!appEl) return;
  await initSession();
  if (shouldShowOnboarding()) {
    onboardingStep = 0;
    renderOnboardingFlow();
    return;
  }
  state = initAppState();
  if (state.lastCelebratedRankKey) {
    state.lastCelebratedRankKey = migrateRankKey(state.lastCelebratedRankKey);
  }
  applyTheme(state.theme);
  setIncomingHandler((remote) => {
    state = remote;
    if (state.lastCelebratedRankKey) {
      state.lastCelebratedRankKey = migrateRankKey(state.lastCelebratedRankKey);
    }
    render();
  });
  recordAppSession(state);
  reconcileAndPersist(state);
  render();
  pullState().then((remote) => {
    if (remote) {
      state = remote;
      if (state.lastCelebratedRankKey) {
        state.lastCelebratedRankKey = migrateRankKey(state.lastCelebratedRankKey);
      }
      reconcileAndPersist(state);
      render();
    }
    subscribeToChanges();
  });
  queueMicrotask(() => {
    try {
      processAchievements(state);
      checkRankCelebration(state);
      evaluateNudges(state);
      reconcileAndPersist(state);
      renderToasts();
      render();
    } catch (err) {
      console.error("LevelUp achievement sync failed:", err);
    }
  });
}

function ensureDay(iso) {
  return getDay(state, iso);
}

/** Keeps running focus timers alive while updating accumulated seconds. */
function tickFocusSession(day) {
  if (!day.focusRunning || !day.focusSegmentStartTs) return;
  const add = Math.max(0, Math.floor((Date.now() - day.focusSegmentStartTs) / 1000));
  if (add > 0) {
    day.focusAccumSec = Math.min(day.focusAccumSec + add, 12 * 3600);
    day.focusSegmentStartTs = Date.now();
    day.focusStartedAt = day.focusSegmentStartTs;
  }
}

function reconcileTodayQualification(st) {
  const iso = isoLocalDate();
  const day = getDay(st, iso);
  tickFocusSession(day);
  const rCount = st.isPro ? st.dopamineRestrictions.length : 0;
  const qualifies = dayQualified(day, rCount);
  st.dayQualifiedByDate[iso] = qualifies;
  const score = disciplineScore(day, rCount);
  day.disciplineSnapshot = score;
  recordDisciplineScore(st, score);
  maybeRecordFocusDay(st, day);
}

function reconcileAndPersist(st) {
  const iso = isoLocalDate();
  reconcileTodayQualification(st);
  syncChallengeXp(st, iso);
  syncXpForToday(st);
  saveState(st);
}

function syncXpForToday(st) {
  const iso = isoLocalDate();
  const day = getDay(st, iso);
  const qualifies = !!st.dayQualifiedByDate[iso];
  const amount = xpForDayCompletion(!!st.isPro);
  if (qualifies && day.xpSyncedForDate !== iso) {
    st.xpTotal += amount;
    day.xpSyncedForDate = iso;
  }
  if (!qualifies && day.xpSyncedForDate === iso) {
    st.xpTotal = Math.max(0, st.xpTotal - amount);
    day.xpSyncedForDate = null;
  }
}

function ensureChallengeMaps(st, iso) {
  if (!st.challengeCompletionsByDate) st.challengeCompletionsByDate = {};
  if (!st.challengeCompletionsByDate[iso]) st.challengeCompletionsByDate[iso] = {};
  if (!st.challengeXpSyncedByDate) st.challengeXpSyncedByDate = {};
  if (!st.challengeXpSyncedByDate[iso]) st.challengeXpSyncedByDate[iso] = {};
}

function syncChallengeXp(st, iso) {
  ensureChallengeMaps(st, iso);
  const completions = st.challengeCompletionsByDate[iso];
  const synced = st.challengeXpSyncedByDate[iso];
  for (const ch of getDailyChallenges(iso)) {
    const done = !!completions[ch.dayKey];
    const wasSynced = !!synced[ch.dayKey];
    if (done && !wasSynced) {
      st.xpTotal += ch.xp;
      synced[ch.dayKey] = true;
    }
    if (!done && wasSynced) {
      st.xpTotal = Math.max(0, st.xpTotal - ch.xp);
      delete synced[ch.dayKey];
    }
  }
}

function userHasCompletedFocusSession(st) {
  if ((st.achievementStats?.focusDaysMet ?? 0) > 0) return true;
  for (const day of Object.values(st.dailyByDate ?? {})) {
    if (!day || typeof day !== "object") continue;
    const target = Math.max(1, Number(day.focusTargetSec) || 25 * 60);
    if (day.focusDayStatCounted || Number(day.focusAccumSec) >= target) return true;
  }
  return false;
}

function syncFocusGuideDismissed(st) {
  if (st.focusGuideDismissed) return;
  if (!userHasCompletedFocusSession(st)) return;
  st.focusGuideDismissed = true;
  saveState(st);
}

function maybeRecordFocusDay(st, day) {
  if (day.focusDayStatCounted) return;
  if (liveFocusSeconds(day) >= day.focusTargetSec) {
    recordFocusDayMet(st, Math.round(liveFocusSeconds(day) / 60));
    day.focusDayStatCounted = true;
    grantMicroXp(st, day, "focus", MICRO_XP.focus);
    st.focusGuideDismissed = true;
  }
}

function pushSoftUpgrade(title, body) {
  pushToast({
    type: "info",
    title,
    body: `${body} Upgrade to Pro to unlock more.`,
    subtle: true,
    duration: 3400,
  });
}

/**
 * Persist a notification to the inbox (survives reloads). Returns the entry.
 * @param {{ type?: string; title: string; body?: string; icon?: string }} payload
 */
function addNotification({ type = "info", title, body = "", icon = "bell" }) {
  const entry = {
    id: crypto.randomUUID?.() ?? `n_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    title,
    body,
    icon,
    ts: Date.now(),
    read: false,
  };
  state.notifications.push(entry);
  if (state.notifications.length > MAX_NOTIFICATIONS) {
    state.notifications = state.notifications.slice(-MAX_NOTIFICATIONS);
  }
  return entry;
}

function unreadNotificationCount() {
  return (state.notifications ?? []).filter((n) => !n.read).length;
}

function processAchievements(st) {
  if (!st.isPro) return;
  const ctx = buildAchievementContext(st);
  const fresh = evaluateNewAchievements(st, ctx);
  const unlocked = [];
  for (const ach of fresh) {
    if (!unlockAchievement(st, ach)) continue;
    unlocked.push(ach.key);
    pushAchievementBadge(ach);
  }
  if (unlocked.length) host.recentUnlockKeys = [...host.recentUnlockKeys, ...unlocked];
  st.achievementNotifiedCount = (st.achievementsUnlocked ?? []).length;
}

function pushAchievementBadge(ach) {
  pushToast({
    type: "achievement",
    subtle: true,
    brief: true,
    title: "Badge unlocked",
    body: ach.title,
    icon: ach.icon,
  });
  addNotification({ type: "achievement", title: "Badge unlocked", body: ach.title, icon: ach.icon });
}

function checkRankCelebration(st) {
  if (st.lastCelebratedRankKey) {
    st.lastCelebratedRankKey = migrateRankKey(st.lastCelebratedRankKey);
  }
  const rank = rankFromXp(st.xpTotal);
  if (st.lastCelebratedRankKey === rank.key) return;
  if (st.lastCelebratedRankKey !== null) {
    pushToast({
      type: "rank",
      subtle: true,
      brief: true,
      title: `Rank up · ${rank.label}`,
      body: "",
      icon: ICON.crown,
    });
    addNotification({
      type: "rank",
      title: `Rank up · ${rank.label}`,
      body: "New rank reached.",
      icon: ICON.crown,
    });
  }
  st.lastCelebratedRankKey = rank.key;
}

/** Consecutive qualified days ending *yesterday* — the streak today's incompletion would break. */
function priorStreak(dayQualifiedByDate) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  let s = 0;
  while (dayQualifiedByDate[isoLocalDate(d)]) {
    s += 1;
    d.setDate(d.getDate() - 1);
  }
  return s;
}

/**
 * On-open re-engagement nudges. No backend: evaluated when the app opens or
 * regains focus. De-duped to once per day per nudge via st.nudgeLog.
 */
function evaluateNudges(st) {
  if (!st.preferences?.notifications) return;
  const iso = isoLocalDate();
  if (st.dayQualifiedByDate[iso]) return; // today already complete — nothing to nag
  const hour = new Date().getHours();
  st.nudgeLog = st.nudgeLog ?? {};

  const prior = priorStreak(st.dayQualifiedByDate);
  if (hour >= 18 && prior > 0 && st.nudgeLog.streak !== iso) {
    addNotification({
      type: "streak",
      title: `Your ${prior}-day streak is at risk`,
      body: "Finish today's quests before midnight to keep it alive.",
      icon: "flame",
    });
    st.nudgeLog.streak = iso;
    return;
  }
  if (hour >= 12 && st.nudgeLog.daily !== iso) {
    addNotification({
      type: "reminder",
      title: "Today's quests aren't done yet",
      body: "Open your dashboard and complete your habits.",
      icon: "target",
    });
    st.nudgeLog.daily = iso;
  }
}

/**
 * @param {{ type?: string; title: string; body?: string; icon?: string; badge?: boolean; subtle?: boolean; brief?: boolean; duration?: number }} payload
 */
function pushToast(payload) {
  const entry = { id: ++toastId, ...payload };
  toastQueue.push(entry);
  renderToasts();
  const ms = payload.duration ?? (payload.brief ? TOAST_BRIEF_MS : TOAST_DURATION_MS);
  window.setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== entry.id);
    renderToasts();
  }, ms);
}

/** @param {string} title @param {string} [body] */
function actionSuccess(title, body = "") {
  pushToast({ type: "success", subtle: true, brief: true, title, body, icon: ICON.check });
}

/** @param {string} title @param {string} body */
function actionError(title, body) {
  pushToast({ type: "error", subtle: true, brief: true, title, body, icon: ICON.alert });
}

/** @param {string} iconKey @param {string} [type] @param {boolean} [subtle] */
function toastIconMarkup(iconKey, type = "", subtle = true) {
  if (!iconKey) return "";
  const size = subtle ? 18 : ICON_SIZE;
  if (type === "success" && iconKey === ICON.check) {
    return iconHtml(iconKey, { filled: true, tone: "success", size });
  }
  if (type === "error") {
    return iconHtml(iconKey, { tone: "inherit", size });
  }
  return iconHtml(iconKey, { colorful: true, chip: false, size });
}

function setBusy(busy) {
  host.busy = busy;
  appEl?.classList.toggle("is-busy", busy);
}

function renderToasts() {
  let layer = document.querySelector(".toast-layer");
  if (!toastQueue.length) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "toast-layer";
    document.body.appendChild(layer);
  }
  layer.innerHTML = toastQueue
    .map((t) => {
      const subtle = t.subtle !== false;
      const iconMarkup = toastIconMarkup(t.icon, t.type, subtle);
      const body = (t.body ?? "").trim();
      const leading = `<span class="toast-icon" aria-hidden="true">${iconMarkup}</span>`;
      const bodyHtml = body ? `<p class="toast-body">${escapeHtml(body)}</p>` : "";
      return `
    <div class="toast toast-${escapeAttr(t.type)}${t.type === "success" ? " toast-success" : ""}${t.type === "error" ? " toast-error" : ""}${subtle ? " toast--subtle" : ""}" role="status">
      ${leading}
      <div class="toast-copy">
        <strong class="toast-title">${escapeHtml(t.title)}</strong>
        ${bodyHtml}
      </div>
    </div>`;
    })
    .join("");
}

function flushFocusSegment(day) {
  if (day.focusRunning && day.focusSegmentStartTs) {
    const add = Math.max(0, Math.floor((Date.now() - day.focusSegmentStartTs) / 1000));
    day.focusAccumSec = Math.min(day.focusAccumSec + add, 12 * 3600);
  }
  day.focusSegmentStartTs = null;
  day.focusStartedAt = null;
  day.focusRunning = false;
}

/** Stop focus timer and clear today's elapsed time (no XP, no session credit). */
function resetFocusTimer(st, day) {
  day.focusRunning = false;
  day.focusSegmentStartTs = null;
  day.focusStartedAt = null;
  day.focusAccumSec = 0;
  if (day.focusDayStatCounted) {
    revokeMicroXp(st, day, "focus", MICRO_XP.focus);
    day.focusDayStatCounted = false;
  }
}

function liveFocusSeconds(day) {
  const extra =
    day.focusRunning && day.focusSegmentStartTs
      ? Math.max(0, Math.floor((Date.now() - day.focusSegmentStartTs) / 1000))
      : 0;
  return Math.min(day.focusAccumSec + extra, 12 * 3600);
}

function fmtTime(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${`${m}`.padStart(2, "0")}:${`${r}`.padStart(2, "0")}`;
}

function elt(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return /** @type {HTMLElement} */ (t.content.firstElementChild);
}

function nestedBackNav() {
  return `
    <div class="screen-inline-nav">
      <button type="button" class="btn btn-secondary btn-with-icon btn-back" data-action="goto-account" aria-label="Back to You">
        <span class="btn-icon-wrap" aria-hidden="true">${iconHtml("arrowRight", { size: ICON_SIZE, tone: "inherit", className: "lu-icon--flip" })}</span>
        <span>You</span>
      </button>
    </div>`;
}

function navButton(key, label, showBadge = false) {
  const active = tabForView(view) === key;
  return elt(`
    <button type="button" class="nav-tab" data-nav="${key}" data-active="${active}" aria-current="${active ? "page" : "false"}" aria-label="${label}">
      <span class="nav-icon-wrap">
        <span class="nav-icon-svg">${navTabIcon(key, active)}</span>
        ${showBadge ? `<span class="nav-badge-dot" aria-label="New badge"></span>` : ""}
      </span>
      <span class="nav-label">${label}</span>
    </button>
  `);
}

function attachNav(navRoot) {
  navRoot.querySelectorAll("[data-nav]").forEach((btn) => {
    const popNavIcon = () => {
      btn.classList.add("nav-tab--tap");
      window.setTimeout(() => btn.classList.remove("nav-tab--tap"), 220);
    };
    btn.addEventListener("pointerdown", popNavIcon);
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-nav");
      if (!key || !TAB_KEYS.includes(key)) return;
      if (key === "account" && NESTED_VIEWS.includes(view)) {
        navigateTo("account");
        return;
      }
      navigateTo(key);
    });
  });
}

function refreshTicker() {
  if (ticker !== null) {
    window.clearInterval(ticker);
    ticker = null;
  }
  if (view === "discipline") {
    const iso = isoLocalDate();
    const day = ensureDay(iso);
    if (day.focusRunning) {
      ticker = window.setInterval(() => {
        const iso2 = isoLocalDate();
        const d = ensureDay(iso2);
        if (iso2 !== iso) {
          refreshTicker();
          render();
          return;
        }
        tickFocusSession(d);
        const rEff = dopamineEffectiveCount();
        const needle = document.getElementById("focus-live");
        if (needle) needle.textContent = fmtTime(liveFocusSeconds(d));
        const scoreEl = document.querySelector("[data-discipline-live]");
        if (scoreEl) scoreEl.textContent = String(disciplineScore(d, rEff));
        const fills = /** @type {HTMLElement | null} */ (document.querySelector("[data-focus-bar]"));
        if (fills) {
          fills.style.width = `${Math.min(100, Math.round((liveFocusSeconds(d) / d.focusTargetSec) * 100))}%`;
        }
      }, 500);
    }
  }
}

/** @param {number} [count] @param {"row" | "card" | "badge"} [kind] */
function skeletonPlaceholder(count = 3, kind = "row") {
  return `<div class="skeleton-group" aria-busy="true" aria-label="Loading content">
    ${Array.from({ length: count }, () => `<div class="skeleton skeleton--${kind}"></div>`).join("")}
  </div>`;
}

function pageStrip() {
  const streak = streakCount(state.dayQualifiedByDate);
  const streakFlame =
    streak > 0
      ? `<span class="streak-flame icon-flame-live" aria-hidden="true">${iconHtml("flame", { colorful: true, chip: false, size: ICON_SIZE })}</span>`
      : "";
  const unread = unreadNotificationCount();
  const muted = !state.preferences?.notifications;
  const bellBadge =
    unread > 0 ? `<span class="inbox-badge" aria-hidden="true">${unread > 9 ? "9+" : unread}</span>` : "";
  const ariaLabel = `Notifications${unread ? ` (${unread} unread)` : ""}${muted ? ", reminders silenced" : ""}`;
  const bell = `<button class="inbox-bell${muted ? " inbox-bell--muted" : ""}" type="button" data-action="open-inbox" aria-label="${ariaLabel}">${iconHtml(muted ? "bellOff" : "bell", { size: ICON_SIZE, tone: "inherit" })}${bellBadge}</button>`;
  return `<header class="page-strip"><span class="page-strip-brand">LevelUp</span><span class="page-strip-gamify">${gamifyStrip()}<span class="page-strip-streak">${streakFlame}<span class="streak-count">${streak}d</span></span>${bell}</span></header>`;
}

function pageHeader(title) {
  return `<header class="page-header"><h1 class="screen-title">${escapeHtml(title)}</h1></header>`;
}

/** @param {string} label @param {string} bodyHtml */
function screenGroup(label, bodyHtml) {
  return `
    <section class="screen-group">
      <h2 class="screen-group-label">${escapeHtml(label)}</h2>
      ${bodyHtml}
    </section>`;
}

/** @deprecated Alias for {@link screenGroup} */
function screenSection(label, bodyHtml) {
  return screenGroup(label, bodyHtml);
}

/** @param {string} rowsHtml @param {boolean} [primary] */
function listCard(rowsHtml, primary = false) {
  return `<div class="card app-list${primary ? " card--primary" : ""}">${rowsHtml}</div>`;
}

/** @param {string} innerHtml */
function checklistCard(innerHtml) {
  return `<div class="card app-list app-list--static">${innerHtml}</div>`;
}

function settingsGroupLabel(text) {
  return `<h2 class="screen-group-label">${escapeHtml(text)}</h2>`;
}

function settingsChevron() {
  return `<span class="settings-row-chevron" aria-hidden="true">${iconHtml("arrowRight", { size: ICON_SIZE, tone: "muted" })}</span>`;
}

/**
 * @param {{ icon: string; title: string; meta?: string; action?: string; danger?: boolean; toggleBind?: string; toggleChecked?: boolean }} opts
 */
function settingsRow(opts) {
  const { icon, title, meta = "", action, danger = false, toggleBind, toggleChecked } = opts;
  const iconEl = `<span class="settings-row-icon" aria-hidden="true">${iconHtml(icon, { colorful: true, chip: false, size: ICON_SIZE })}</span>`;
  const body = `<span class="settings-row-body"><span class="settings-row-title">${escapeHtml(title)}</span>${meta ? `<span class="settings-row-meta muted">${escapeHtml(meta)}</span>` : ""}</span>`;

  if (toggleBind) {
    const toggle = `<span class="settings-row-toggle"><input type="checkbox" role="switch" data-bind="${escapeAttr(toggleBind)}" ${toggleChecked ? "checked" : ""} aria-label="${escapeAttr(title)}" /></span>`;
    return `<div class="settings-row settings-row--toggle">${iconEl}${body}${toggle}</div>`;
  }

  const cls = `settings-row${danger ? " settings-row--danger" : ""}`;
  return `<button type="button" class="${cls}" data-action="${escapeAttr(action ?? "")}">${iconEl}${body}${settingsChevron()}</button>`;
}

/** @param {string} label @param {string} innerHtml */
function settingsGroup(label, innerHtml) {
  return screenGroup(label, innerHtml);
}

function ensurePreferences() {
  if (!state.preferences || typeof state.preferences !== "object") {
    state.preferences = { notifications: true, sound: true };
  }
}

function profileInitials() {
  const name = String(state.displayName ?? "").trim();
  if (!name) return "";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Unified screen shell: strip, title, optional purpose line, grouped body, optional primary footer.
 * @param {{ title: string; purpose?: string; body: string; footer?: string }} opts
 */
function screenLayout(opts) {
  const { title, purpose = "", body, footer = "" } = opts;
  const purposeHtml = purpose
    ? `<p class="screen-purpose muted">${escapeHtml(purpose)}</p>`
    : "";
  return `
    ${pageStrip()}
    <section class="screen">
      <div class="screen-top">${pageHeader(title)}${purposeHtml}</div>
      <div class="screen-body">${body}</div>
      ${footer ? `<footer class="screen-footer screen-footer--primary">${footer}</footer>` : ""}
    </section>`;
}

/** @param {number} pct @param {"default" | "compact" | "thin" | "rank"} [variant] */
function progressBar(pct, variant = "default") {
  const w = Math.min(100, Math.max(0, Math.round(pct)));
  let cls = "progress";
  if (variant === "compact") cls += " progress--compact";
  else if (variant === "thin") cls += " progress--thin";
  else if (variant === "rank") cls += " progress--thin progress--rank";
  return `<div class="${cls}" role="progressbar" aria-valuenow="${w}" aria-valuemin="0" aria-valuemax="100"><span style="width:${w}%"></span></div>`;
}

function dailyChallengesCard(iso) {
  const challenges = getDailyChallenges(iso);
  const rows = challenges
    .map((ch) => {
      const complete = isChallengeDone(state, iso, ch.dayKey);
      return `
      <button type="button" class="app-list-row challenge-row${complete ? " challenge-done" : ""}" data-action="challenge-toggle" data-challenge-key="${escapeAttr(ch.dayKey)}" data-feedback-row>
        <span class="challenge-icon" aria-hidden="true">${iconHtml(ch.icon, { colorful: true })}</span>
        <span class="challenge-main">
          <span class="challenge-text">${escapeHtml(ch.text)}</span>
          <span class="challenge-meta">+${ch.xp} XP</span>
        </span>
        <span class="challenge-check" aria-hidden="true">${complete ? iconHtml("check", { filled: true, tone: "success", size: ICON_SIZE }) : ""}</span>
      </button>`;
    })
    .join("");
  return listCard(rows, true);
}

function challengesView() {
  const iso = isoLocalDate();
  const done = todayChallengesDone(state, iso);
  const qs = Array.isArray(state.quests) ? state.quests : [];
  const rows = qs
    .map(
      (q) => `
      <button type="button" class="app-list-row quest-row" data-action="quest-complete" data-quest-id="${escapeAttr(q.id)}" data-feedback-row ${q.done ? "disabled" : ""}>
        <span class="app-list-row-title">${escapeHtml(q.text)}</span>
        <span class="quest-meta${q.done ? " quest-meta--done" : ""}">${q.done ? `${iconHtml("check", { filled: true, tone: "success", size: ICON_SIZE })}<span>Complete</span>` : `+${QUEST_XP} XP`}</span>
      </button>`
    )
    .join("");

  const sideQuestsCard = listCard(qs.length ? rows : `<div class="app-list-pad">${skeletonPlaceholder(2, "row")}</div>`);

  return screenLayout({
    title: "Quests",
    purpose: "Complete daily quests and track your own side quests.",
    body: `
      ${screenGroup(`Today's quests · ${done}/3`, dailyChallengesCard(iso))}
      ${screenGroup("Side quests", sideQuestsCard)}`,
    footer: `
      <div class="row row--form row--form-footer">
        <input type="text" class="input-grow" data-bind="quest-input" maxlength="120" placeholder="Add a side quest" aria-label="New side quest" />
        <button type="button" class="btn btn-primary btn-with-icon" data-action="quest-add"><span class="btn-icon-wrap" aria-hidden="true">${iconHtml("plus", { size: ICON_SIZE, tone: "inherit" })}</span><span>Add quest</span></button>
      </div>`,
  });
}

function achievementsView() {
  if (!state.isPro) {
    return screenLayout({
      title: "Badges",
      purpose: "Badges and achievement history are included with Pro.",
      body: `
        ${nestedBackNav()}
        ${screenGroup(
          "Pro feature",
          `<div class="card card--primary plan-upgrade-gate">
            <p class="muted">Free includes a basic timer and daily checklist. Unlock badges, XP milestones, and your full stats history with Pro.</p>
          </div>`
        )}`,
      footer: `<button class="btn btn-primary btn-block" type="button" data-action="sheet-paywall">Upgrade to Pro</button>`,
    });
  }

  const ctx = buildAchievementContext(state);
  const unlockedSet = new Set(state.achievementsUnlocked ?? []);
  const earnedCount = unlockedSet.size;
  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ae = unlockedSet.has(a.key) ? 0 : 1;
    const be = unlockedSet.has(b.key) ? 0 : 1;
    return ae - be;
  });

  const tiles = sorted
    .map((a) => {
      const on = unlockedSet.has(a.key);
      const prog = getAchievementProgress(a, ctx);
      const pct = on ? 100 : Math.min(100, Math.round((prog.current / Math.max(1, prog.target)) * 100));
      const justUnlocked = host.recentUnlockKeys.includes(a.key);
      const flameLive = a.icon === "flame";
      const chipAnim = [justUnlocked ? "icon-chip--unlock-pop" : "", flameLive ? "icon-flame-live" : ""]
        .filter(Boolean)
        .join(" ");
      return `
      <article class="badge-card${on ? " badge-unlocked" : " badge-locked"}${justUnlocked ? " badge-card--unlock-pop" : ""}" data-badge-key="${escapeAttr(a.key)}">
        <div class="badge-icon-wrap" aria-hidden="true"><span class="badge-icon">${iconHtml(a.icon, { size: ICON_SIZE_LG, colorful: true, chipSize: 44, className: chipAnim })}</span>${on ? `<span class="badge-check">${iconHtml("check", { filled: true, tone: "inherit", size: 12 })}</span>` : ""}</div>
        <div class="badge-body">
          <strong>${escapeHtml(a.title)}</strong>
          <p class="muted badge-desc">${escapeHtml(a.desc)}</p>
          ${on ? "" : `<div class="badge-progress">${progressBar(pct, "compact")}</div>`}
        </div>
      </article>`;
    })
    .join("");

  return screenLayout({
    title: "Badges",
    purpose: "Earn badges by hitting milestones across training, focus, and quests.",
    body: `
      ${nestedBackNav()}
      ${screenGroup("Collection", `<div class="card card--primary"><div class="badge-grid">${tiles}</div><p class="badge-grid-meta muted">${earnedCount} of ${ACHIEVEMENTS.length} unlocked</p></div>`)}`,
  });
}

function focusGuideSection() {
  const steps = [
    { icon: "clock", label: "Set your time" },
    { icon: "target", label: "Stay focused" },
    { icon: "zap", label: "Earn rewards" },
  ];
  const stepHtml = steps
    .map(
      (s) => `
      <li class="focus-step">
        <span class="focus-step-icon" aria-hidden="true">${iconHtml(s.icon, { colorful: true, chip: false, size: ICON_SIZE })}</span>
        <span class="focus-step-label">${escapeHtml(s.label)}</span>
      </li>`
    )
    .join("");

  return `
    <div class="focus-guide">
      <p class="focus-guide-lead">A focus session is a dedicated block of uninterrupted work. Start the timer, stay with one task, and build your discipline score as you go.</p>
      <h3 class="focus-guide-title">How it works</h3>
      <ol class="focus-steps">${stepHtml}</ol>
    </div>`;
}

/** @param {ReturnType<typeof ensureDay>} day @param {boolean} showGuide */
function focusTimerCard(day, showGuide) {
  const focusLive = fmtTime(liveFocusSeconds(day));
  const targetLabel = fmtTime(day.focusTargetSec);

  return `
    <div class="card card--focus">
      <p class="focus-goal-hint muted">${targetLabel} goal</p>
      ${showGuide ? focusGuideSection() : ""}
      <div class="focus-display">
        <div id="focus-live" class="timer-big" aria-live="polite">${focusLive}</div>
        <p class="focus-tip">${showGuide ? "Put your phone down and eliminate distractions." : "One task, one timer — you’ve got this."}</p>
      </div>
    </div>`;
}

function greetingPeriod() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function displayNameForGreeting() {
  const raw = String(state.displayName ?? "").trim();
  return raw.length ? raw : "there";
}

/** @param {string} iso @param {number} discs @param {number} dailyPct */
function dashboardGreetingBlock(iso, discs, dailyPct) {
  const xpToday = xpEarnedToday(state, iso);
  const questsDone = todayChallengesDone(state, iso);
  const qualified = !!state.dayQualifiedByDate?.[iso];

  return `
    <div class="dash-greeting card card--primary">
      <p class="dash-greeting-hello">${escapeHtml(greetingPeriod())}, ${escapeHtml(displayNameForGreeting())}</p>
      <p class="dash-greeting-summary">
        <span class="dash-summary-stat"><strong data-discipline-live>${discs}</strong> discipline</span>
        <span class="dash-summary-dot" aria-hidden="true">·</span>
        <span class="dash-summary-stat"><strong>${dailyPct}%</strong> today</span>
        <span class="dash-summary-dot" aria-hidden="true">·</span>
        <span class="dash-summary-stat"><strong>${xpToday}</strong> / ${DAILY_XP_GOAL} XP</span>
        <span class="dash-summary-dot" aria-hidden="true">·</span>
        <span class="dash-summary-stat"><strong>${questsDone}/3</strong> quests</span>
      </p>
      ${progressBar(dailyPct, "thin")}
      <p class="dash-greeting-meta muted">${qualified ? "Day qualified" : "Keep going to qualify today"}</p>
    </div>`;
}

function dashboardWidgetsSection(iso) {
  const streak = streakCount(state.dayQualifiedByDate ?? {});
  const xpToday = xpEarnedToday(state, iso);
  const xpPct = Math.min(100, Math.round((xpToday / DAILY_XP_GOAL) * 100));

  return `
    <div class="widget-grid widget-grid--pair" aria-label="At a glance">
      <button type="button" class="widget-card" data-nav-jump="account" aria-label="View profile and streak">
        <span class="widget-card-top">
          <span class="widget-icon widget-icon--flame" aria-hidden="true">${iconHtml("flame", { colorful: true, chip: false, size: ICON_SIZE })}</span>
          <span class="widget-label">Streak</span>
        </span>
        <span class="widget-value">${streak}<span class="widget-value-unit">d</span></span>
        <span class="widget-hint">${streak === 1 ? "day qualified" : "days qualified"}</span>
      </button>
      <button type="button" class="widget-card" data-nav-jump="challenges" aria-label="View daily quests">
        <span class="widget-card-top">
          <span class="widget-icon" aria-hidden="true">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })}</span>
          <span class="widget-label">XP today</span>
        </span>
        <span class="widget-value widget-value--sm">${xpToday} <span class="widget-muted">/ ${DAILY_XP_GOAL}</span></span>
        <div class="widget-progress" role="progressbar" aria-valuenow="${xpPct}" aria-valuemin="0" aria-valuemax="100">
          <span class="widget-progress-fill" style="width:${xpPct}%"></span>
        </div>
      </button>
    </div>`;
}

/** @param {ReturnType<typeof ensureDay>} day */
function dashboardDailyChecklist(day) {
  const habitLabels = state.habitLabels;
  const rows = `
    <label class="app-list-row app-list-row--check checkbox-line checkbox-line--compact">
      <input id="wq" type="checkbox" ${day.workoutComplete ? "checked" : ""} data-bind="toggle-workout" />
      <span class="app-list-row-title">Workout complete</span>
    </label>
    ${habitLabels
      .map(
        (lbl, idx) => `
      <label class="app-list-row app-list-row--check checkbox-line checkbox-line--compact">
        <input id="hb-${idx}" type="checkbox" data-habit="${idx}" ${day.habits[idx] ? "checked" : ""} />
        <span class="app-list-row-title">${escapeHtml(lbl)}</span>
      </label>`
      )
      .join("")}`;
  return checklistCard(rows);
}

function dashboard() {
  const iso = isoLocalDate();
  const day = ensureDay(iso);
  reconcileTodayQualification(state);
  const rEff = dopamineEffectiveCount();
  const discs = disciplineScore(day, rEff);
  const dailyPct = dailyProgressPercent(state, iso, rEff);
  const focusLive = fmtTime(liveFocusSeconds(day));
  const focusLabel = day.focusRunning
    ? `Focus in progress · ${focusLive}`
    : `No active session · ${fmtTime(day.focusTargetSec)} goal`;

  return screenLayout({
    title: "Home",
    purpose: "Today’s progress and what’s left to do.",
    body: `
      ${screenGroup("Overview", dashboardGreetingBlock(iso, discs, dailyPct))}
      ${screenGroup("At a glance", dashboardWidgetsSection(iso))}
      ${screenGroup("Daily checklist", dashboardDailyChecklist(day))}`,
    footer: `
      <p class="screen-footer-hint muted">${escapeHtml(focusLabel)}</p>
      <button type="button" class="btn ${day.focusRunning ? "btn-secondary" : "btn-primary"} btn-block" data-nav-jump="discipline">${day.focusRunning ? "Continue focus session" : "Start focus session"}</button>`,
  });
}

function trainView() {
  const iso = isoLocalDate();
  const day = ensureDay(iso);
  const goalChips = [
    { key: "lean", label: "Lean" },
    { key: "recomp", label: "Recomp" },
    { key: "bulk", label: "Bulk" },
  ];

  const goalCard = `
    <div class="card card--primary">
      ${
        state.isPro
          ? `<label class="field">
        <span>Program week</span>
        <input type="number" min="1" max="12" step="1" value="${escapeAttr(String(state.programWeek))}" data-bind="program-week-range" aria-label="Program week" />
      </label>`
          : ""
      }
      <div class="chip-bar" role="radiogroup" aria-label="Physique goal">
        ${goalChips
          .map(
            (g) => `
            <button type="button" class="btn btn-chip" data-action="physique-${g.key}" data-selected="${state.physiqueGoal === g.key}">${g.label}</button>`
          )
          .join("")}
      </div>
    </div>`;

  const liftsCard = `
    <div class="card card--primary">
      <table class="table table--spaced" aria-label="Today's lifts">
        <thead><tr><th>Lift</th><th>KG</th><th>Reps</th>${state.isPro ? "<th>Sets</th>" : ""}</tr></thead>
        <tbody>
          ${day.exercises.map((ex, i) => lockedRow(ex, i, !state.isPro)).join("")}
        </tbody>
      </table>
    </div>`;

  return screenLayout({
    title: "Train",
    purpose: "Set your physique goal and log today’s lifts.",
    body: `
      ${screenGroup("Physique goal", goalCard)}
      ${screenGroup("Today's lifts", liftsCard)}`,
    footer: !state.isPro
      ? `<button class="btn btn-primary btn-block" type="button" data-action="sheet-paywall">Unlock full training</button>`
      : "",
  });
}

function lockedRow(ex, index, locked) {
  const dis = locked ? "disabled" : "";
  const idx = escapeAttr(String(index));
  const setsTd = state.isPro
    ? `<td><input type="number" min="1" max="15" step="1" value="${Number(ex.sets) || ""}" ${dis} class="mini-input" data-ex-part="sets" data-ex="${idx}" /></td>`
    : "";
  return `<tr>
    <td>
      ${
        state.isPro
          ? `<input type="text" value="${escapeHtml(ex.name ?? "")}" class="mini-input mini-input--wide" data-ex-part="name" data-ex="${idx}" />`
          : escapeHtml(ex.name ?? "")
      }
    </td>
    <td><input ${dis} class="mini-input" type="number" step="0.25" inputmode="decimal" min="0" value="${Number(ex.weight) !== 0 ? ex.weight : ""}" data-ex-part="kg" data-ex="${idx}" /></td>
    <td><input ${dis} class="mini-input" type="number" min="1" max="100" step="1" value="${Number(ex.reps) !== 0 ? ex.reps : ""}" data-ex-part="reps" data-ex="${idx}" /></td>
    ${setsTd}
  </tr>`;
}

function disciplineView() {
  const iso = isoLocalDate();
  const day = ensureDay(iso);
  ensureDopamineMap(day);
  syncFocusGuideDismissed(state);
  const showFocusGuide = !state.focusGuideDismissed;

  const guardrails = state.dopamineRestrictions
    .map(
      (dr) => `
      <div class="app-list-row app-list-row--check guardrail-row">
        <label class="checkbox-line checkbox-line--compact guardrail-row-main">
          <input type="checkbox" data-dopamine="${escapeAttr(dr.id)}" ${day.dopamineById?.[dr.id] ? "checked" : ""} />
          ${
            state.isPro
              ? `<input type="text" class="input-grow guardrail-label-input" value="${escapeHtml(dr.label)}" data-guardrail-label="${escapeAttr(dr.id)}" maxlength="72" aria-label="Guardrail name" />`
              : `<span>${escapeHtml(dr.label)}</span>`
          }
        </label>
        ${
          state.isPro
            ? `<button type="button" class="btn btn-danger btn-icon" data-action="del-rest" data-rest-id="${escapeAttr(dr.id)}" aria-label="Remove guardrail">${iconHtml("x", { size: ICON_SIZE, tone: "inherit" })}</button>`
            : ""
        }
      </div>`
    )
    .join("");

  const guardrailsCard = listCard(guardrails || `<div class="app-list-pad">${skeletonPlaceholder(2, "row")}</div>`, true);
  const freeFocusNote =
    !state.isPro && day.freeFocusSessionUsed && !day.focusRunning
      ? `<p class="focus-free-limit muted">You’ve used today’s free focus session. Upgrade for unlimited sessions.</p>`
      : "";

  return screenLayout({
    title: "Focus",
    purpose: state.isPro
      ? "Run your focus timer and mark guardrails you kept today."
      : "Run your basic focus timer — one session per day on Free.",
    body: `
      ${screenGroup("Focus session", `${focusTimerCard(day, showFocusGuide)}${freeFocusNote}`)}
      ${state.isPro ? screenGroup("Guardrails", guardrailsCard) : ""}`,
    footer: `
      <div class="focus-actions">
        <button type="button" class="btn ${day.focusRunning ? "btn-secondary" : "btn-primary"} btn-block" data-action="focus-toggle">${day.focusRunning ? "Pause focus" : "Start focus"}</button>
        <button type="button" class="btn btn-secondary btn-with-icon btn-block" data-action="focus-reset">
          <span class="btn-icon-wrap" aria-hidden="true">${iconHtml("rotateCw", { size: ICON_SIZE, tone: "inherit" })}</span>
          <span>Reset</span>
        </button>
      </div>
      ${
        state.isPro
          ? `<button class="btn btn-secondary btn-with-icon btn-block" type="button" data-action="add-rest"><span class="btn-icon-wrap" aria-hidden="true">${iconHtml("plus", { size: ICON_SIZE, tone: "inherit" })}</span><span>Add guardrail</span></button>`
          : `<button class="btn btn-primary btn-block" type="button" data-action="sheet-paywall">Unlock custom guardrails</button>`
      }`,
  });
}

function fmtMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function moneyView() {
  const iso = isoLocalDate();
  const weekDates = weekDatesFrom(isoWeekMonday(iso));
  const weekEntries = weekDates.map((d) => ensureDay(d));
  const hoursWeek = weekHoursProgress(weekEntries.map((d) => ({ workHours: d.workHours })));
  const monthDates = monthDatesFrom(iso);
  const monthEntries = monthDates.map((d) => ensureDay(d));
  const incomeMonth = monthIncomeProgress(monthEntries.map((d) => ({ income: d.incomeToday })));

  const weekTarget = Math.max(1, Number(state.money?.weeklyHoursTarget) || 1);
  const monthTarget = Math.max(1, Number(state.money?.monthlyIncomeGoal) || 1);
  const weekPct = Math.min(100, Math.round((hoursWeek / weekTarget) * 100));
  const monthPct = Math.min(100, Math.round((incomeMonth / monthTarget) * 100));

  if (!state.isPro) {
    return screenLayout({
      title: "Money",
      purpose: "Track weekly hours and monthly income toward your goals.",
      body: `
        ${nestedBackNav()}
        ${screenGroup("Tracking", `<div class="card card--primary"><p class="muted card-lead">Pro unlocks goals, progress bars, and daily logging.</p></div>`)}`,
      footer: `<button class="btn btn-primary btn-block" type="button" data-action="sheet-paywall">Unlock money tracking</button>`,
    });
  }

  const day = ensureDay(iso);
  const goalsCard = `
    <div class="card card--primary">
      <label class="field">
        Weekly hours goal
        <input type="number" inputmode="decimal" step="1" min="5" max="80" value="${escapeAttr(String(weekTarget))}" data-bind="weekly-hours-target" />
      </label>
      <label class="field">
        Monthly income goal
        <input type="number" inputmode="decimal" step="100" min="0" value="${escapeAttr(String(monthTarget))}" data-bind="monthly-income-goal" />
      </label>
    </div>`;

  const progressCard = `
    <div class="card card--primary">
      <div class="metric-block">
        <div class="row row-between row-split"><span>Weekly hours</span><span>${hoursWeek.toFixed(1)} / ${weekTarget}h</span></div>
        ${progressBar(weekPct)}
      </div>
      <div class="metric-block">
        <div class="row row-between row-split"><span>Monthly income</span><span>$${fmtMoney(incomeMonth)} / $${fmtMoney(monthTarget)}</span></div>
        ${progressBar(monthPct)}
      </div>
    </div>`;

  return screenLayout({
    title: "Money",
    purpose: "Track weekly hours and monthly income toward your goals.",
    body: `
      ${nestedBackNav()}
      ${screenGroup("Goals", goalsCard)}
      ${screenGroup("Progress", progressCard)}`,
    footer: `
      <label class="field field--flush">
        <span class="screen-group-label">Log today</span>
        <div class="row row--inputs">
          <input type="number" class="input-grow" inputmode="decimal" step="0.25" min="0" max="24" value="${Number(day.workHours) || ""}" data-bind="work-hours" placeholder="Hours" aria-label="Work hours today" />
          <input type="number" class="input-grow" inputmode="decimal" min="0" step="10" value="${Number(day.incomeToday) || ""}" data-bind="income-today" placeholder="Income" aria-label="Income today" />
        </div>
      </label>`,
  });
}

function settingsView() {
  const theme = state.theme ?? { presetId: "midnight-dark", custom: {} };
  const active = theme.presetId;
  const custom = theme.custom ?? {};
  const resolved = resolveThemeColors(theme);

  const presetCards = THEME_PRESETS.map(
    (p) => `
    <button type="button" class="theme-preset" data-action="theme-preset" data-preset-id="${escapeAttr(p.id)}" data-active="${active === p.id}">
      <span class="theme-swatch-row" aria-hidden="true">
        <span class="theme-swatch" style="background:${p.primary}"></span>
        <span class="theme-swatch" style="background:${p.secondary}"></span>
        <span class="theme-swatch" style="background:${p.accent}"></span>
      </span>
      <span class="theme-preset-name">${escapeHtml(p.name)}</span>
    </button>`
  ).join("");

  const customColors = `
      <div class="color-picker-grid">
        <div class="color-picker-row">
          <label for="theme-primary">Background</label>
          <input id="theme-primary" type="color" value="${escapeAttr(custom.primary ?? resolved.primary)}" data-bind="theme-primary" />
        </div>
        <div class="color-picker-row">
          <label for="theme-secondary">Surfaces</label>
          <input id="theme-secondary" type="color" value="${escapeAttr(custom.secondary ?? resolved.secondary)}" data-bind="theme-secondary" />
        </div>
        <div class="color-picker-row">
          <label for="theme-accent">Accent</label>
          <input id="theme-accent" type="color" value="${escapeAttr(custom.accent ?? resolved.accent)}" data-bind="theme-accent" />
        </div>
      </div>`;

  return screenLayout({
    title: "Theme",
    purpose: "Choose a preset or customize app colors.",
    body: `
      ${nestedBackNav()}
      ${screenGroup(
        "Presets",
        `<div class="settings-list card card--primary"><div class="theme-preset-grid theme-preset-grid--settings" role="list">${presetCards}</div></div>`
      )}
      ${screenGroup("Custom colors", `<div class="settings-list card">${customColors}</div>`)}`,
  });
}

function habitsSettingsView() {
  const rows = [0, 1, 2]
    .map(
      (i) => `
      <label class="field field--flush settings-habit-field">
        <span>Habit ${i + 1}</span>
        <input type="text" value="${escapeHtml(state.habitLabels[i])}" maxlength="72" data-bind="habit-label-${i}" placeholder="Habit name" aria-label="Habit ${i + 1} name" />
      </label>`
    )
    .join("");

  return screenLayout({
    title: "Daily habits",
    purpose: "Names for habits on your home checklist.",
    body: `
      ${nestedBackNav()}
      ${screenGroup("Habit names", `<div class="settings-list card"><div class="stack-sm settings-habit-stack">${rows}</div></div>`)}`,
  });
}

function privacyView() {
  return screenLayout({
    title: "Privacy",
    purpose: "How your data is stored on this device.",
    body: `
      ${nestedBackNav()}
      ${screenGroup(
        "Your data",
        `<div class="settings-list card"><p class="privacy-copy muted">LevelUp stores your progress, habits, and preferences locally in this browser. We do not upload your data to a server unless you use a connected checkout or sync feature.</p><p class="privacy-copy muted">Delete your account from You to remove all saved data from this device.</p></div>`
      )}`,
  });
}

function accountView() {
  ensurePreferences();
  const resolved = resolveThemeColors(state.theme);
  const rank = rankFromXp(state.xpTotal ?? 0);
  const rankPct = rankProgressPercent(state.xpTotal ?? 0, rank);
  const unlockedCount = (state.achievementsUnlocked ?? []).length;
  const { sessions, focusSec } = lifetimeActivityStats(state);
  const prefs = state.preferences;
  const avatarKey = AVATAR_CYCLE.includes(state.avatarIcon) ? state.avatarIcon : AVATAR_CYCLE[0];
  const initials = profileInitials();
  const toNext = rank.nextAt !== null ? Math.max(0, rank.nextAt - (state.xpTotal ?? 0)) : 0;

  const profileBlock = `
    <div class="settings-list card card--primary profile-hero">
      <button type="button" class="profile-avatar" data-action="avatar-cycle" aria-label="Change avatar icon">
        <span class="profile-avatar-ring" aria-hidden="true">${iconHtml(avatarKey, { colorful: true, size: ICON_SIZE_LG, chip: true, chipSize: 56 })}</span>
        ${initials ? `<span class="profile-avatar-initials">${escapeHtml(initials)}</span>` : ""}
      </button>
      <label class="profile-name-field">
        <span class="visually-hidden">Your name</span>
        <input type="text" class="profile-name-input" value="${escapeHtml(String(state.displayName ?? ""))}" maxlength="40" data-bind="display-name" placeholder="Your name" aria-label="Your name" autocomplete="name" />
      </label>
      ${state.userEmail ? `<p class="profile-email muted">${escapeHtml(String(state.userEmail))}</p>` : ""}
      <div class="profile-level-row">
        <span class="profile-rank-pill">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })}<span>${escapeHtml(rank.label)}</span></span>
        <span class="profile-xp">${state.xpTotal ?? 0} XP</span>
      </div>
      ${progressBar(rankPct, "thin")}
      ${rank.nextAt !== null ? `<p class="profile-rank-hint muted">${toNext} XP to ${escapeHtml(nextLabelFromRank(rank))}</p>` : ""}
    </div>`;

  const prefsList = `
    <div class="settings-list card">
      ${settingsRow({ icon: "brush", title: "Theme", meta: resolved.presetName, action: "goto-settings" })}
      ${settingsRow({ icon: "bell", title: "Notifications", meta: "Quest and badge reminders", toggleBind: "pref-notifications", toggleChecked: prefs.notifications })}
      ${settingsRow({ icon: "sparkles", title: "Sound effects", meta: "Timer and XP feedback", toggleBind: "pref-sound", toggleChecked: prefs.sound })}
      ${settingsRow({ icon: "clipboardList", title: "Daily habit names", meta: "Edit your three habits", action: "goto-habits" })}
      ${settingsRow({ icon: "wallet", title: "Money tracking", meta: state.isPro ? "Hours and income" : "Pro feature", action: "goto-money" })}
    </div>`;

  const statsList = state.isPro
    ? `
    <div class="settings-list card">
      <div class="stats-summary stats-summary--compact" aria-label="Lifetime stats">
        <div class="stats-summary-cell">
          <span class="stats-summary-value">${unlockedCount}</span>
          <span class="stats-summary-label muted">Badges</span>
        </div>
        <div class="stats-summary-cell">
          <span class="stats-summary-value">${sessions}</span>
          <span class="stats-summary-label muted">Sessions</span>
        </div>
        <div class="stats-summary-cell">
          <span class="stats-summary-value">${escapeHtml(formatFocusDuration(focusSec))}</span>
          <span class="stats-summary-label muted">Focus</span>
        </div>
      </div>
      ${settingsRow({ icon: "medal", title: "All badges", meta: `${unlockedCount} of ${ACHIEVEMENTS.length} unlocked`, action: "goto-achievements" })}
    </div>`
    : `
    <div class="settings-list card">
      <p class="stats-free-lock muted">Stats history and badges are available on Pro. Your Free plan keeps today’s checklist and one focus session per day.</p>
      ${settingsRow({ icon: "medal", title: "All badges", meta: "Pro feature", action: "goto-achievements" })}
    </div>`;

  const accountList = `
    <div class="settings-list card">
      ${settingsRow({ icon: "shieldCheck", title: "Privacy", meta: "How your data is stored", action: "goto-privacy" })}
      ${settingsRow({ icon: "unlock", title: "Sign out", meta: "End session on this device", action: "sign-out" })}
      ${settingsRow({ icon: "x", title: "Delete account", meta: "Erase all local data", action: "delete-account", danger: true })}
    </div>`;

  return screenLayout({
    title: "You",
    purpose: "Profile, preferences, stats, and account controls.",
    body: `
      ${screenGroup("Profile", profileBlock)}
      ${screenGroup("App preferences", prefsList)}
      ${screenGroup("Stats & achievements", statsList)}
      ${screenGroup("Account", accountList)}`,
    footer: `<button class="btn btn-primary btn-block" type="button" data-action="sheet-paywall">${state.isPro ? "View Pro benefits" : "Upgrade to Pro"}</button>`,
  });
}

function stripeConfigured() {
  const annual = String(CFG.stripeAnnualUrl ?? "");
  const monthly = String(CFG.stripeMonthlyUrl ?? "");
  return /^https?:\/\//.test(annual) || /^https?:\/\//.test(monthly);
}

function planFeatureList(items) {
  return `<ul class="plan-features">${items.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`;
}

function paywallSheet() {
  const demoPro = !stripeConfigured();
  const freeFeatures = planFeatureList(FREE_PLAN_FEATURES);
  const proFeatures = planFeatureList(PRO_PLAN_FEATURES);
  return `
    <div class="sheet-backdrop" data-action="sheet-close"></div>
    <div class="sheet sheet--pricing" role="dialog" aria-modal="true" aria-label="Choose your plan">
      <div class="sheet-header">
        <div>
          <h2 class="sheet-title">Choose your plan</h2>
          <p class="muted sheet-lead">Start free or unlock the full discipline system with Pro.</p>
        </div>
        <button class="btn btn-secondary btn-icon sheet-close" type="button" data-action="sheet-close" aria-label="Close">${iconHtml("x", { size: ICON_SIZE, tone: "inherit" })}</button>
      </div>

      <div class="pricing-plans" role="list">
        <article class="plan-card plan-card--free" role="listitem" data-plan="free" tabindex="0">
          <div class="plan-card-head">
            <span class="plan-badge plan-badge--limited">Limited</span>
            <h3 class="plan-name">Free</h3>
            <p class="plan-price">$0<span class="plan-price-unit">/month</span></p>
          </div>
          ${freeFeatures}
        </article>

        <div class="plan-paid-row" role="presentation">
          <article class="plan-card plan-card--paid" role="listitem" data-plan="monthly" tabindex="0" aria-label="Monthly plan">
            <h3 class="plan-name">Pro Monthly</h3>
            <p class="plan-price plan-price--accent">$9.99<span class="plan-price-unit">/month</span></p>
          </article>

          <article class="plan-card plan-card--paid plan-card--popular" role="listitem" data-plan="annual" data-selected="true" tabindex="0" aria-label="Annual plan, most popular">
            <span class="plan-badge plan-badge--popular">Most Popular</span>
            <h3 class="plan-name">Pro Annual</h3>
            <p class="plan-price plan-price--accent">$79.99<span class="plan-price-unit">/year</span></p>
            <p class="plan-save muted">Save ~$40 vs monthly</p>
          </article>
        </div>
        <div class="plan-pro-includes">
          <p class="plan-pro-label">Pro includes</p>
          ${proFeatures}
        </div>
      </div>

      <button class="btn btn-primary btn-block" type="button" id="plan-paid-cta">Continue with Annual</button>
      ${
        demoPro
          ? `<button class="btn btn-secondary btn-block" type="button" data-action="demo-pro-enable">Try Pro on this device</button>`
          : ""
      }
      <p class="muted sheet-footnote">${demoPro ? "Checkout links are not configured yet. Use Try Pro to explore paid features locally." : "Secure checkout. Cancel anytime."}</p>
      <button class="plan-continue-free" type="button" data-action="plan-continue-free">Continue with Free</button>
    </div>
  `;
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

function notificationRow(n) {
  const icon = iconHtml(n.icon || "bell", { colorful: true, size: ICON_SIZE });
  const bodyHtml = n.body ? `<p class="inbox-body muted">${escapeHtml(n.body)}</p>` : "";
  return `
    <div class="inbox-item${n.read ? "" : " inbox-item--unread"} inbox-item--${escapeAttr(n.type)}">
      <span class="inbox-item-icon" aria-hidden="true">${icon}</span>
      <div class="inbox-item-copy">
        <strong class="inbox-title">${escapeHtml(n.title)}</strong>
        ${bodyHtml}
        <span class="inbox-time muted">${escapeHtml(relativeTime(n.ts))}</span>
      </div>
    </div>`;
}

function inboxSheet() {
  const items = [...(state.notifications ?? [])].sort((a, b) => b.ts - a.ts);
  const body = items.length
    ? `<div class="inbox-list">${items.map(notificationRow).join("")}</div>`
    : `<div class="inbox-empty muted"><p>No notifications yet.</p><p>Complete quests and unlock badges to see your activity here.</p></div>`;
  return `
    <div class="sheet-backdrop" data-action="close-inbox"></div>
    <div class="sheet sheet--inbox" role="dialog" aria-modal="true" aria-label="Notifications">
      <div class="sheet-header">
        <div>
          <h2 class="sheet-title">Notifications</h2>
          <p class="muted sheet-lead">Your recent activity and reminders.</p>
        </div>
        <button class="btn btn-secondary btn-icon sheet-close" type="button" data-action="close-inbox" aria-label="Close">${iconHtml("x", { size: ICON_SIZE, tone: "inherit" })}</button>
      </div>
      ${body}
      ${items.length ? `<button class="btn btn-secondary btn-block" type="button" data-action="notifications-clear">Clear all</button>` : ""}
    </div>
  `;
}

function ensureDopamineMap(day) {
  state.dopamineRestrictions.forEach((dr) => {
    if (!(dr.id in (day.dopamineById ?? {}))) {
      day.dopamineById[dr.id] = false;
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function dopamineEffectiveCount() {
  return state.isPro ? state.dopamineRestrictions.length : 0;
}

function attachCommonHandlers(root) {
  root.querySelectorAll("[data-action]").forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    el.addEventListener("click", onActionClick);
  });

  root.querySelectorAll("[data-bind]").forEach((node) => {
    const el = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (node);
    const key = el.getAttribute("data-bind");
    if (!key) return;
    const binders = {
      "toggle-workout": () => {
        const iso = isoLocalDate();
        const day = ensureDay(iso);
        const checked = el.checked;
        day.workoutComplete = checked;
        commit(
          () => {
            if (checked) {
              grantMicroXp(state, day, "workout", MICRO_XP.workout);
              if (!day.workoutStatCounted) {
                bumpWorkoutCompleted(state);
                day.workoutStatCounted = true;
              }
            } else {
              revokeMicroXp(state, day, "workout", MICRO_XP.workout);
            }
          },
          { feedbackSelector: "#wq" }
        );
      },
      "workout-note": () => {
        const iso = isoLocalDate();
        ensureDay(iso).workoutNote = el.value;
        commit(() => {});
      },
      "work-hours": () => {
        const v = validateWorkHoursToday(el.value);
        if (!v.ok) {
          showInlineError(el, v.message);
          actionError("Invalid hours", v.message);
          return;
        }
        clearInlineError(el);
        const iso = isoLocalDate();
        ensureDay(iso).workHours = v.value;
        commit(() => {});
      },
      "income-today": () => {
        const v = validateIncomeToday(el.value);
        if (!v.ok) {
          showInlineError(el, v.message);
          actionError("Invalid income", v.message);
          return;
        }
        clearInlineError(el);
        const iso = isoLocalDate();
        ensureDay(iso).incomeToday = v.value;
        commit(() => {});
      },
      "program-week-range": () => {
        const v = validateProgramWeek(el.value);
        if (!v.ok) {
          showInlineError(el, v.message);
          actionError("Invalid week", v.message);
          return;
        }
        clearInlineError(el);
        commit(() => {
          state.programWeek = v.value;
        });
      },
      "weekly-hours-target": () => {
        const v = validateWeeklyHoursGoal(el.value);
        if (!v.ok) {
          showInlineError(el, v.message);
          actionError("Invalid goal", v.message);
          return;
        }
        clearInlineError(el);
        commit(() => {
          state.money.weeklyHoursTarget = v.value;
        });
      },
      "monthly-income-goal": () => {
        const v = validateMonthlyIncomeGoal(el.value);
        if (!v.ok) {
          showInlineError(el, v.message);
          actionError("Invalid goal", v.message);
          return;
        }
        clearInlineError(el);
        commit(() => {
          state.money.monthlyIncomeGoal = v.value;
        });
      },
      "theme-primary": () => {
        if (!state.theme) return;
        commit(() => {
          state.theme.presetId = CUSTOM_PRESET_ID;
          state.theme.custom = { ...state.theme.custom, primary: el.value };
        });
      },
      "theme-secondary": () => {
        if (!state.theme) return;
        commit(() => {
          state.theme.presetId = CUSTOM_PRESET_ID;
          state.theme.custom = { ...state.theme.custom, secondary: el.value };
        });
      },
      "theme-accent": () => {
        if (!state.theme) return;
        commit(() => {
          state.theme.presetId = CUSTOM_PRESET_ID;
          state.theme.custom = { ...state.theme.custom, accent: el.value };
        });
      },
      "pref-notifications": () => {
        ensurePreferences();
        commit(() => {
          state.preferences.notifications = el.checked;
        });
      },
      "pref-sound": () => {
        ensurePreferences();
        commit(() => {
          state.preferences.sound = el.checked;
        });
      },
    };
    const fn = binders[key];
    if (!fn) return;
    el.addEventListener("change", fn);
    el.addEventListener("blur", fn);
    if (key.startsWith("theme-")) el.addEventListener("input", fn);
  });

  root.querySelectorAll("[data-habit]").forEach((node) => {
    const el = /** @type {HTMLInputElement} */ (node);
    el.addEventListener("change", () => {
      const idx = Number(el.getAttribute("data-habit"));
      const iso = isoLocalDate();
      const day = ensureDay(iso);
      if (!Array.isArray(day.habits)) day.habits = [false, false, false];
      const checked = el.checked;
      day.habits[idx] = checked;
      const key = `habit-${idx}`;
      commit(
        () => {
          if (checked) grantMicroXp(state, day, key, MICRO_XP.habit);
          else revokeMicroXp(state, day, key, MICRO_XP.habit);
        },
        { feedbackSelector: `#hb-${idx}` }
      );
    });
  });

  root.querySelectorAll("[data-dopamine]").forEach((node) => {
    const el = /** @type {HTMLInputElement} */ (node);
    el.addEventListener("change", () => {
      const id = el.getAttribute("data-dopamine");
      if (!id) return;
      const iso = isoLocalDate();
      const day = ensureDay(iso);
      const checked = el.checked;
      day.dopamineById[id] = checked;
      const key = `guardrail-${id}`;
      commit(
        () => {
          if (checked) grantMicroXp(state, day, key, MICRO_XP.guardrail);
          else revokeMicroXp(state, day, key, MICRO_XP.guardrail);
        },
        { feedbackSelector: feedbackSel("data-dopamine", id) }
      );
    });
  });

  root.querySelectorAll("[data-ex-part][data-ex]").forEach((node) => {
    const input = /** @type {HTMLInputElement} */ (node);
    const commitEx = () => {
      const idx = Number(input.getAttribute("data-ex"));
      const part = input.getAttribute("data-ex-part");
      const iso = isoLocalDate();
      const day = ensureDay(iso);
      const ex = day.exercises[idx];
      if (!ex || !part) return;
      const v = validateExerciseField(input.value, part);
      if (!v.ok) {
        showInlineError(input, v.message);
        actionError("Invalid lift entry", v.message);
        return;
      }
      clearInlineError(input);
      if (part === "name") ex.name = v.value;
      if (part === "kg") ex.weight = v.value;
      if (part === "reps") ex.reps = v.value;
      if (part === "sets") ex.sets = v.value;
      commit(() => {});
    };
    input.addEventListener("change", commitEx);
    input.addEventListener("blur", commitEx);
  });

  root.querySelectorAll("[data-guardrail-label]").forEach((node) => {
    const input = /** @type {HTMLInputElement} */ (node);
    input.addEventListener("blur", () => {
      const id = input.getAttribute("data-guardrail-label");
      if (!id || !state.isPro) return;
      const label = input.value.trim();
      if (!label) {
        showInlineError(input, "Guardrail name cannot be empty.");
        actionError("Invalid name", "Guardrail name cannot be empty.");
        return;
      }
      clearInlineError(input);
      const dr = state.dopamineRestrictions.find((d) => d.id === id);
      if (!dr) return;
      dr.label = label.slice(0, 72);
      commit(() => {});
    });
  });

  const questInput = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-bind="quest-input"]'));
  questInput?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    root.querySelector('[data-action="quest-add"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  root.querySelectorAll("[data-nav-jump]").forEach((node) => {
    node.addEventListener("click", () => {
      const key = node.getAttribute("data-nav-jump");
      if (key && VIEWS.includes(key)) navigateTo(key);
    });
  });

  const displayNameFld = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-bind="display-name"]'));
  displayNameFld?.addEventListener("blur", () => {
    const v = validateDisplayName(displayNameFld.value);
    if (!v.ok) {
      showInlineError(displayNameFld, v.message);
      actionError("Invalid name", v.message);
      return;
    }
    clearInlineError(displayNameFld);
    state.displayName = v.value;
    updateSessionProfile({ name: v.value });
    commit(() => {});
  });

  for (let i = 0; i < 3; i++) {
    const fld = /** @type {HTMLInputElement | null} */ (root.querySelector(`[data-bind="habit-label-${i}"]`));
    fld?.addEventListener("blur", () => {
      const v = validateHabitLabel(fld.value);
      if (!v.ok) {
        showInlineError(fld, v.message);
        actionError("Invalid habit", v.message);
        return;
      }
      clearInlineError(fld);
      state.habitLabels[i] = v.value;
      commit(() => {});
    });
  }
}

function closePaywallSheet() {
  host.openSheet = false;
  document.querySelector(".paywall-layer")?.remove();
  render();
}

function chipSelect(root, selector, setter) {
  root.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      setter(btn);
    });
  });
}

function attachPaywallInteractions(root) {
  let selectedPaid = "annual";

  const syncPaidSelection = () => {
    root.querySelectorAll(".plan-card--paid").forEach((card) => {
      const el = /** @type {HTMLElement} */ (card);
      const plan = el.getAttribute("data-plan");
      el.setAttribute("data-selected", `${plan === selectedPaid}`);
    });
    const cta = /** @type {HTMLButtonElement | null} */ (document.getElementById("plan-paid-cta"));
    if (cta) {
      cta.textContent = selectedPaid === "annual" ? "Continue with Annual" : "Continue with Monthly";
    }
  };

  root.querySelectorAll(".plan-card--paid").forEach((card) => {
    const pick = () => {
      const plan = card.getAttribute("data-plan");
      if (plan === "monthly" || plan === "annual") {
        selectedPaid = plan;
        syncPaidSelection();
      }
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });
  });

  syncPaidSelection();

  const paidCta = document.getElementById("plan-paid-cta");
  paidCta?.addEventListener("click", () => {
    const annual = selectedPaid === "annual";
    const url = annual ? CFG.stripeAnnualUrl || "" : CFG.stripeMonthlyUrl || "";
    if (url && /^https?:\/\//.test(url)) {
      commit(
        () => {
          state.isPro = true;
          state.subscribedAnnual = annual;
        },
        {
          onDone: () => {
            closePaywallSheet();
            navigateTo("home");
            window.open(url, "_blank", "noopener,noreferrer");
          },
        }
      );
      return;
    }
    if (!stripeConfigured()) {
      document.querySelector('[data-action="demo-pro-enable"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      return;
    }
    actionError(
      "Checkout unavailable",
      "Add stripeAnnualUrl and stripeMonthlyUrl in index.html under __LEVELUP_CONFIG__."
    );
  });
}

function onActionClick(e) {
  const target = /** @type {HTMLElement} */ (e.currentTarget);
  if (target instanceof HTMLButtonElement && target.disabled) return;
  const action = target.getAttribute("data-action");
  if (!action) return;

  if (action === "onboarding-skip") {
    e.preventDefault();
    skipToSignup();
    return;
  }
  if (action === "onboarding-back") {
    e.preventDefault();
    onboardingStep = Math.max(0, onboardingStep - 1);
    renderOnboardingFlow();
    return;
  }
  if (action === "onboarding-next") {
    e.preventDefault();
    onboardingStep = Math.min(ONBOARDING_SIGNUP_STEP, onboardingStep + 1);
    renderOnboardingFlow();
    return;
  }
  if (action === "onboarding-complete") {
    e.preventDefault();
    finishOnboarding();
    return;
  }

  if (action === "open-inbox") {
    (state.notifications ?? []).forEach((n) => {
      n.read = true;
    });
    host.openInbox = true;
    saveState(state);
    render();
    return;
  }
  if (action === "close-inbox") {
    host.openInbox = false;
    document.querySelector(".inbox-layer")?.remove();
    render();
    return;
  }
  if (action === "notifications-clear") {
    state.notifications = [];
    saveState(state);
    render();
    return;
  }

  if (host.busy) return;
  if (action === "sheet-paywall") {
    host.openSheet = true;
    render();
    return;
  }
  if (action === "sheet-close") {
    closePaywallSheet();
    return;
  }
  if (action === "plan-continue-free") {
    commit(
      () => {
        state.isPro = false;
        state.subscribedAnnual = false;
      },
      {
        onDone: () => {
          closePaywallSheet();
          navigateTo("home");
          pushToast({
            type: "info",
            title: "Free plan active",
            body: "Upgrade anytime from You when you want more.",
            subtle: true,
            brief: true,
          });
        },
      }
    );
    return;
  }
  if (action === "demo-pro-enable") {
    commit(
      () => {
        state.isPro = true;
        state.subscribedAnnual = true;
      },
      {
        onDone: () => {
          closePaywallSheet();
          navigateTo("home");
          pushToast({
            type: "success",
            title: "Pro enabled",
            body: "All Pro features are unlocked on this device.",
            subtle: true,
            brief: true,
          });
        },
      }
    );
    return;
  }
  if (action === "focus-toggle") {
    const iso = isoLocalDate();
    const day = ensureDay(iso);
    if (!day.focusRunning && !canStartFreeFocusSession(state.isPro, day)) {
      pushSoftUpgrade("Daily focus limit reached", "Free includes one focus session per day.");
      host.openSheet = true;
      render();
      return;
    }
    commit(
      () => {
        if (day.focusRunning) flushFocusSegment(day);
        else {
          if (!state.isPro) day.freeFocusSessionUsed = true;
          day.focusRunning = true;
          day.focusSegmentStartTs = Date.now();
          day.focusStartedAt = day.focusSegmentStartTs;
        }
      },
      {}
    );
    refreshTicker();
    return;
  }
  if (action === "focus-reset") {
    const iso = isoLocalDate();
    const day = ensureDay(iso);
    if (!state.isPro && day.freeFocusSessionUsed) {
      pushSoftUpgrade("Session already used", "Free includes one focus session per day.");
      host.openSheet = true;
      render();
      return;
    }
    commit(
      () => resetFocusTimer(state, day),
      {
        onDone: () => {
          pushToast({
            type: "success",
            subtle: true,
            brief: true,
            duration: TOAST_RESET_MS,
            title: "Timer reset",
            body: "",
            icon: ICON.rotateCw,
          });
        },
      }
    );
    refreshTicker();
    return;
  }
  if (action.startsWith("physique-")) {
    const goal = action.replace("physique-", "");
    commit(() => {
      state.physiqueGoal = /** @type {any} */ (goal);
    });
    return;
  }
  if (action === "add-rest") {
    if (!state.isPro) {
      actionError("Pro feature", "Upgrade to add custom guardrails.");
      return;
    }
    const id = crypto.randomUUID?.() ?? `r_${Math.random().toString(36).slice(2)}`;
    commit(
      () => {
        state.dopamineRestrictions.push({ id, label: "New guardrail" });
        ensureDay(isoLocalDate()).dopamineById[id] = false;
      },
      {}
    );
    return;
  }
  if (action === "del-rest") {
    if (!state.isPro) return;
    const id = target.getAttribute("data-rest-id");
    if (!id) return;
    if (state.dopamineRestrictions.length <= 1) {
      actionError("Cannot remove", "Keep at least one guardrail.");
      return;
    }
    const dr = state.dopamineRestrictions.find((d) => d.id === id);
    const ok = window.confirm(`Remove guardrail "${dr?.label ?? "this rule"}"?`);
    if (!ok) return;
    commit(() => {
      state.dopamineRestrictions = state.dopamineRestrictions.filter((d) => d.id !== id);
      Object.values(state.dailyByDate).forEach((day) => {
        if (day.dopamineById && id in day.dopamineById) delete day.dopamineById[id];
      });
    });
    return;
  }
  if (action === "goto-settings") {
    navigateTo("settings");
    return;
  }
  if (action === "goto-account") {
    navigateTo("account");
    return;
  }
  if (action === "goto-achievements") {
    navigateTo("achievements");
    return;
  }
  if (action === "goto-money") {
    navigateTo("money");
    return;
  }
  if (action === "goto-habits") {
    navigateTo("habits");
    return;
  }
  if (action === "goto-privacy") {
    navigateTo("privacy");
    return;
  }
  if (action === "avatar-cycle") {
    const idx = AVATAR_CYCLE.indexOf(state.avatarIcon);
    const next = AVATAR_CYCLE[(idx < 0 ? 0 : idx + 1) % AVATAR_CYCLE.length];
    commit(() => {
      state.avatarIcon = next;
    });
    return;
  }
  if (action === "sign-out") {
    (async () => {
      await flushPendingPush();
      await signOutAndClearData();
      window.location.replace("/");
    })();
    return;
  }
  if (action === "delete-account") {
    const ok = window.confirm("Delete your account and remove all LevelUp data from this device? This cannot be undone.");
    if (!ok) return;
    (async () => {
      await signOutAndClearData();
      window.location.replace("/");
    })();
    return;
  }
  if (action === "theme-preset") {
    const id = target.getAttribute("data-preset-id");
    if (!id) return;
    const preset = THEME_PRESETS.find((p) => p.id === id);
    commit(() => {
      if (!state.theme) state.theme = { presetId: id, custom: {} };
      state.theme.presetId = id;
    });
    return;
  }
  if (action === "quest-add") {
    const input = /** @type {HTMLInputElement | null} */ (document.querySelector('[data-bind="quest-input"]'));
    const v = validateQuestText(input?.value ?? "");
    if (!v.ok) {
      showInlineError(input, v.message);
      actionError("Could not add quest", v.message);
      return;
    }
    clearInlineError(input);
    commit(
      () => {
        if (!Array.isArray(state.quests)) state.quests = [];
        state.quests.push({
          id: crypto.randomUUID?.() ?? `q_${Math.random().toString(36).slice(2)}`,
          text: v.value,
          done: false,
        });
      },
      {}
    );
    return;
  }
  if (action === "quest-complete") {
    const id = target.getAttribute("data-quest-id");
    if (!id) return;
    commit(
      () => {
        if (!Array.isArray(state.quests)) state.quests = [];
        const q = state.quests.find((x) => x.id === id);
        if (!q || q.done) return;
        q.done = true;
        state.xpTotal += QUEST_XP;
        bumpSideQuestCompleted(state);
      },
      { feedbackSelector: feedbackSel("data-quest-id", id) }
    );
    return;
  }
  if (action === "challenge-toggle") {
    const key = target.getAttribute("data-challenge-key");
    if (!key) return;
    const iso = isoLocalDate();
    const ch = getDailyChallenges(iso).find((c) => c.dayKey === key);
    commit(
      () => {
        ensureChallengeMaps(state, iso);
        const cur = !!state.challengeCompletionsByDate[iso][key];
        state.challengeCompletionsByDate[iso][key] = !cur;
      },
      {
        feedbackSelector: feedbackSel("data-challenge-key", key),
        onDone: () => {},
      }
    );
    return;
  }
  if (action === "reset-local") {
    const ok = window.confirm("Delete all local LevelUp data on this device?");
    if (!ok) return;
    (async () => {
      await signOutAndClearData();
      window.location.replace("/");
    })();
    return;
  }
}


/** @param {(st: AppState) => void} mutator @param {{ feedbackSelector?: string | null; toast?: { type?: string; title: string; body?: string; icon?: string }; onDone?: () => void }} [opts] */
function commit(mutator, opts = {}) {
  if (host.busy) return;
  setBusy(true);
  const xpBefore = state.xpTotal ?? 0;
  host.feedbackSelector = opts.feedbackSelector ?? null;
  const started = Date.now();

  const finish = () => {
    try {
      mutator(state);
      const iso = isoLocalDate();
      reconcileTodayQualification(state);
      syncChallengeXp(state, iso);
      syncXpForToday(state);
      processAchievements(state);
      checkRankCelebration(state);
      pruneOldDays(state);
      applyTheme(state.theme);
      host.lastXpGain = Math.max(0, (state.xpTotal ?? 0) - xpBefore);
      saveState(state);
      setBusy(false);
      render();
      runGamifyFeedback();
      if (opts.toast) pushToast(opts.toast);
      opts.onDone?.();
    } catch (err) {
      setBusy(false);
      render();
      actionError("Could not save", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const delay = Math.max(0, 160 - (Date.now() - started));
  if (delay > 0) window.setTimeout(finish, delay);
  else finish();
}

function runGamifyFeedback() {
  if (host.lastXpGain > 0) showXpFloat(host.lastXpGain);
  host.lastXpGain = 0;
  if (host.recentUnlockKeys.length) {
    for (const key of host.recentUnlockKeys) {
      const chip = document.querySelector(`[data-badge-key="${key}"] .icon-chip`);
      chip?.classList.add("icon-chip--unlock-pop");
    }
    const keys = [...host.recentUnlockKeys];
    host.recentUnlockKeys = [];
    window.setTimeout(() => {
      for (const key of keys) {
        document.querySelector(`[data-badge-key="${key}"] .icon-chip`)?.classList.remove("icon-chip--unlock-pop");
        document.querySelector(`[data-badge-key="${key}"]`)?.classList.remove("badge-card--unlock-pop");
      }
    }, 280);
  }
  if (host.feedbackSelector) {
    const el = document.querySelector(host.feedbackSelector);
    if (el) {
      el.classList.add("action-pop");
      window.setTimeout(() => el.classList.remove("action-pop"), 280);
    }
    host.feedbackSelector = null;
  }
}

function showXpFloat(amount) {
  let layer = document.querySelector(".xp-float-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "xp-float-layer";
    document.body.appendChild(layer);
  }
  const bubble = document.createElement("div");
  bubble.className = "xp-float";
  bubble.innerHTML = `<span class="xp-float-icon" aria-hidden="true">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })}</span><span>+${amount} XP</span>`;
  layer.appendChild(bubble);
  window.setTimeout(() => bubble.remove(), 900);
  const xpIcon = document.querySelector(".xp-chip-icon");
  xpIcon?.classList.add("xp-chip-icon--earn");
  document.querySelector(".xp-chip")?.classList.add("xp-chip--pulse");
  window.setTimeout(() => {
    xpIcon?.classList.remove("xp-chip-icon--earn");
    document.querySelector(".xp-chip")?.classList.remove("xp-chip--pulse");
  }, 280);
}

function gamifyStrip() {
  const rank = rankFromXp(state.xpTotal ?? 0);
  const rankPct = rankProgressPercent(state.xpTotal ?? 0, rank);
  return `<span class="xp-chip"><span class="xp-chip-icon" aria-hidden="true">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })}</span><span class="xp-chip-text">${state.xpTotal ?? 0} XP</span></span>
    <span class="rank-pip"><span class="rank-pip-fill" style="width:${rankPct}%"></span></span>
    <span class="rank-label">${escapeHtml(rank.label)}</span>`;
}

function nextLabelFromRank(rank) {
  if (rank.key === "beginner") return "Pro";
  if (rank.key === "pro") return "Elite";
  return "Elite";
}

function gamifyProgressBlock(dailyPct, rank, rankPct) {
  const toNext = rank.nextAt !== null ? Math.max(0, rank.nextAt - (state.xpTotal ?? 0)) : 0;
  return `
    <div class="gamify-progress">
      <div class="gamify-progress-row">
        <span class="gamify-progress-label">Today</span>
        <span class="gamify-progress-value">${dailyPct}%</span>
      </div>
      ${progressBar(dailyPct, "thin")}
      <div class="gamify-progress-row gamify-progress-row--spaced">
        <span class="gamify-progress-label">${escapeHtml(rank.label)}${rank.nextAt !== null ? ` → ${escapeHtml(nextLabelFromRank(rank))}` : ""}</span>
        <span class="gamify-progress-value">${state.xpTotal ?? 0} XP</span>
      </div>
      ${progressBar(rankPct, "rank")}
      ${rank.nextAt !== null ? `<p class="gamify-progress-hint">${toNext} XP to ${escapeHtml(nextLabelFromRank(rank))}</p>` : ""}
    </div>`;
}

function render() {
  if (!appEl) return;
  document.querySelector(".paywall-layer")?.remove();
  document.querySelector(".inbox-layer")?.remove();

  const iso = isoLocalDate();
  ensureDay(iso);
  reconcileAndPersist(state);
  if (state.lastCelebratedRankKey === null) {
    state.lastCelebratedRankKey = rankFromXp(state.xpTotal).key;
    saveState(state);
  }

  const body =
    view === "home"
      ? dashboard()
      : view === "challenges"
        ? challengesView()
        : view === "achievements"
          ? achievementsView()
          : view === "train"
          ? trainView()
          : view === "discipline"
            ? disciplineView()
            : view === "money"
              ? moneyView()
              : view === "settings"
                ? settingsView()
                : view === "habits"
                  ? habitsSettingsView()
                  : view === "privacy"
                    ? privacyView()
                    : accountView();

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.setAttribute("aria-label", "Primary");
  if (view === "achievements") {
    state.achievementNotifiedCount = (state.achievementsUnlocked ?? []).length;
    saveState(state);
  }
  recordViewVisit(state, view);
  const unseenBadges = state.isPro ? countUnseenAchievements(state) : 0;

  for (const { key, label } of NAV_ITEMS) {
    const b = navButton(key, label, key === "account" && unseenBadges > 0);
    nav.appendChild(b);
  }
  attachNav(nav);

  appEl.replaceChildren();
  appEl.classList.remove("is-loading");
  const wrap = document.createElement("div");
  wrap.innerHTML = body;
  while (wrap.firstChild) appEl.appendChild(wrap.firstChild);
  appEl.appendChild(nav);

  applyTheme(state.theme);
  attachCommonHandlers(appEl);
  if (host.openSheet) {
    const layer = document.createElement("div");
    layer.className = "paywall-layer";
    layer.innerHTML = paywallSheet();
    document.body.appendChild(layer);
    attachCommonHandlers(layer);
    attachPaywallInteractions(layer);
  }
  if (host.openInbox) {
    const layer = document.createElement("div");
    layer.className = "inbox-layer";
    layer.innerHTML = inboxSheet();
    document.body.appendChild(layer);
    attachCommonHandlers(layer);
  }

  refreshTicker();
  renderToasts();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushFocusSegment(ensureDay(isoLocalDate()));
    saveState(state);
    flushPendingPush();
  } else if (document.visibilityState === "visible") {
    try {
      reconcileAndPersist(state);
      evaluateNudges(state);
      saveState(state);
      render();
    } catch (err) {
      console.error("LevelUp nudge check failed:", err);
    }
  }
});

window.addEventListener("beforeunload", () => {
  flushFocusSegment(ensureDay(isoLocalDate()));
  saveState(state);
});

bootstrap().catch((err) => {
  console.error("LevelUp failed to start:", err);
  if (appEl) {
    const msg = err instanceof Error ? err.message : String(err);
    appEl.classList.remove("is-loading");
    appEl.innerHTML = `<div class="card mt-section"><h2 class="screen-title">Could not load</h2><p class="muted">${msg.replace(/</g, "&lt;")}</p></div>`;
    applyTheme(state?.theme);
  }
});