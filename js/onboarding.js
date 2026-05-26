/**
 * Guest product preview and sign-up (no real user data).
 */

import { iconHtml, ICON_SIZE, ICON_SIZE_LG } from "./icons.js";

/** Index of the sign-up step (after preview slides 0–3). */
export const ONBOARDING_SIGNUP_STEP = 4;

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @param {number} step */
function previewPanel(step) {
  if (step === 0) {
    return `
      <div class="onboarding-preview onboarding-preview--welcome">
        <span class="onboarding-logo" aria-hidden="true">${iconHtml("zap", { colorful: true, size: ICON_SIZE_LG, chip: true, chipSize: 64 })}</span>
        <p class="onboarding-tagline">Train. Build. Improve. Repeat.</p>
        <p class="onboarding-guest-badge muted">Sample preview — not your data</p>
      </div>`;
  }
  if (step === 1) {
    return `
      <div class="onboarding-preview onboarding-preview--mock">
        <div class="onboarding-mock-strip"><span>LevelUp</span><span class="onboarding-mock-xp">— XP</span></div>
        <div class="onboarding-mock-card">
          <p class="onboarding-mock-hello">Your daily board</p>
          <p class="onboarding-mock-stats"><strong>—</strong> discipline · <strong>—</strong> today</p>
          <div class="onboarding-mock-bar"><span style="width:0%"></span></div>
        </div>
        <div class="onboarding-mock-widgets">
          <span class="onboarding-mock-chip">${iconHtml("flame", { colorful: true, chip: false, size: ICON_SIZE })} — streak</span>
          <span class="onboarding-mock-chip">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })} — XP</span>
        </div>
      </div>`;
  }
  if (step === 2) {
    return `
      <div class="onboarding-preview onboarding-preview--mock">
        <div class="onboarding-mock-card onboarding-mock-card--focus">
          <span class="onboarding-mock-label">Focus</span>
          <p class="onboarding-mock-timer">25:00</p>
          <p class="onboarding-mock-sub muted">Timer + guardrails</p>
        </div>
        <div class="onboarding-mock-list">
          <span class="onboarding-mock-list-row">${iconHtml("shieldCheck", { colorful: true, chip: false, size: ICON_SIZE })} Example guardrail</span>
          <span class="onboarding-mock-list-row">${iconHtml("shieldCheck", { colorful: true, chip: false, size: ICON_SIZE })} Example guardrail</span>
        </div>
      </div>`;
  }
  return `
    <div class="onboarding-preview onboarding-preview--mock">
      <div class="onboarding-mock-split">
        <div class="onboarding-mock-card onboarding-mock-card--sm">
          <span class="onboarding-mock-label">Quests</span>
          <p class="onboarding-mock-sub">${iconHtml("zap", { colorful: true, chip: false, size: ICON_SIZE })} Daily quests</p>
        </div>
        <div class="onboarding-mock-card onboarding-mock-card--sm">
          <span class="onboarding-mock-label">Train</span>
          <p class="onboarding-mock-sub">${iconHtml("dumbbell", { colorful: true, chip: false, size: ICON_SIZE })} Log lifts</p>
        </div>
      </div>
      <div class="onboarding-mock-card onboarding-mock-card--sm">
        <span class="onboarding-mock-label">Badges & XP</span>
        <p class="onboarding-mock-sub">${iconHtml("medal", { colorful: true, chip: false, size: ICON_SIZE })} Earn as you show up</p>
      </div>
    </div>`;
}

const SLIDE_COPY = [
  {
    title: "Welcome to LevelUp",
    body: "A discipline system for training, focus, and daily wins — with XP, streaks, and badges that keep you honest.",
  },
  {
    title: "Your home board",
    body: "See today’s progress at a glance: discipline score, XP, streak, and a checklist for habits and workouts.",
  },
  {
    title: "Focus that counts",
    body: "Run a focus timer, mark guardrails you kept, and build momentum without leaving the app.",
  },
  {
    title: "Quests, train, level up",
    body: "Complete daily quests, log lifts, and unlock badges as your consistency compounds.",
  },
];

/** @param {number} step */
export function renderOnboarding(step) {
  const total = ONBOARDING_SIGNUP_STEP + 1;
  const isSignup = step >= ONBOARDING_SIGNUP_STEP;
  const copy = !isSignup ? (SLIDE_COPY[step] ?? SLIDE_COPY[0]) : null;
  const dots = Array.from({ length: total }, (_, i) => {
    const active = i === step;
    return `<span class="onboarding-dot${active ? " onboarding-dot--active" : ""}" aria-hidden="true"></span>`;
  }).join("");

  const preview = isSignup
    ? `
      <div class="onboarding-preview onboarding-preview--signup">
        <span class="onboarding-signup-icon" aria-hidden="true">${iconHtml("users", { colorful: true, size: ICON_SIZE_LG, chip: true, chipSize: 56 })}</span>
        <div class="onboarding-signup-fields stack-sm">
          <label class="field field--flush">
            <span>Name</span>
            <input type="text" class="profile-name-input" value="" maxlength="40" data-bind="onboarding-name" placeholder="Your name" aria-label="Your name" autocomplete="name" />
          </label>
          <label class="field field--flush">
            <span>Email</span>
            <input type="email" class="profile-name-input" value="" maxlength="120" data-bind="onboarding-email" placeholder="you@example.com" aria-label="Email" autocomplete="email" />
          </label>
          <label class="field field--flush">
            <span>Password</span>
            <input type="password" class="profile-name-input" value="" maxlength="128" data-bind="onboarding-password" placeholder="At least 8 characters" aria-label="Password" autocomplete="new-password" />
          </label>
        </div>
        <p class="muted onboarding-signup-note">Your account stays on this device until you sign out. Passwords are stored securely as a hash, not plain text.</p>
      </div>`
    : previewPanel(step);

  const title = isSignup ? "Create your account" : copy?.title ?? "";
  const body = isSignup
    ? "Sign up to save your progress and pick up where you left off on any visit."
    : copy?.body ?? "";

  const backBtn =
    step > 0
      ? `<button type="button" class="btn btn-secondary btn-block" data-action="onboarding-back">Back</button>`
      : "";
  const skipBtn = !isSignup
    ? `<button type="button" class="btn btn-secondary btn-ghost btn-block" data-action="onboarding-skip">Skip Tour</button>`
    : "";
  const nextLabel = isSignup ? "Sign up" : "Next";
  const nextAction = isSignup ? "onboarding-complete" : "onboarding-next";

  return `
    <section class="onboarding" aria-label="Welcome to LevelUp">
      <header class="onboarding-header">
        <span class="onboarding-brand">LevelUp</span>
        <div class="onboarding-dots" role="tablist" aria-label="Onboarding progress">${dots}</div>
      </header>
      <div class="onboarding-body">
        ${preview}
        <div class="onboarding-copy">
          <h1 class="onboarding-title">${escapeHtml(title)}</h1>
          <p class="onboarding-lead muted">${escapeHtml(body)}</p>
        </div>
      </div>
      <footer class="onboarding-footer">
        ${skipBtn}
        ${backBtn}
        <button type="button" class="btn btn-primary btn-block" data-action="${nextAction}">${escapeHtml(nextLabel)}</button>
      </footer>
    </section>`;
}
