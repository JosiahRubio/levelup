/** Daily challenge pool + achievement definitions for LevelUp. */

/** @typedef {{ id: string; text: string; category: string; xp: number; icon: string }} ChallengeTemplate */

/** @type {ChallengeTemplate[]} */
export const CHALLENGE_POOL = [
  { id: "hydrate", text: "Drink 8 glasses of water", category: "body", xp: 15, icon: "droplet" },
  { id: "walk10", text: "Walk 10 minutes outside", category: "body", xp: 15, icon: "footprints" },
  { id: "stretch", text: "10-minute mobility stretch", category: "body", xp: 15, icon: "activity" },
  { id: "protein", text: "Hit your protein target", category: "body", xp: 20, icon: "dumbbell" },
  { id: "nosugar", text: "No added sugar today", category: "discipline", xp: 20, icon: "shield" },
  { id: "noscreen", text: "No phone for first hour awake", category: "discipline", xp: 25, icon: "smartphone" },
  { id: "journal", text: "Write 5 lines in a journal", category: "mind", xp: 15, icon: "notebookPen" },
  { id: "read20", text: "Read 20 pages (or 20 min)", category: "mind", xp: 20, icon: "bookOpen" },
  { id: "learn", text: "Learn one new concept deeply", category: "mind", xp: 20, icon: "brain" },
  { id: "meditate", text: "Meditate 10 minutes", category: "mind", xp: 15, icon: "circle" },
  { id: "gratitude", text: "List 3 things you're grateful for", category: "mind", xp: 10, icon: "sparkles" },
  { id: "inbox", text: "Inbox zero (email/messages)", category: "work", xp: 20, icon: "inbox" },
  { id: "deepwork", text: "One 90-min deep work block", category: "work", xp: 25, icon: "zap" },
  { id: "ship", text: "Ship one small deliverable", category: "work", xp: 25, icon: "rocket" },
  { id: "network", text: "Reach out to one person intentionally", category: "social", xp: 15, icon: "users" },
  { id: "compliment", text: "Give one genuine compliment", category: "social", xp: 10, icon: "messageCircle" },
  { id: "tidy", text: "Tidy your workspace 10 minutes", category: "discipline", xp: 15, icon: "brush" },
  { id: "cold", text: "2-minute cold shower finish", category: "body", xp: 20, icon: "snowflake" },
  { id: "sleep", text: "In bed by your target time", category: "discipline", xp: 20, icon: "moon" },
  { id: "plan", text: "Plan tomorrow in writing", category: "work", xp: 15, icon: "clipboardList" },
  { id: "nosnack", text: "No mindless snacking", category: "discipline", xp: 15, icon: "apple" },
  { id: "steps", text: "8,000+ steps", category: "body", xp: 20, icon: "footprints" },
  { id: "skill", text: "Practice a skill 30 minutes", category: "mind", xp: 20, icon: "target" },
  { id: "finance", text: "Review spending for 5 minutes", category: "work", xp: 15, icon: "wallet" },
  { id: "kind", text: "One act of kindness (no post)", category: "social", xp: 15, icon: "heart" },
  { id: "nature", text: "10 minutes in nature / sunlight", category: "body", xp: 15, icon: "sun" },
  { id: "breath", text: "Box breathing 4 rounds", category: "mind", xp: 10, icon: "wind" },
  { id: "declutter", text: "Remove 5 items you don't need", category: "discipline", xp: 15, icon: "package" },
  { id: "cook", text: "Cook a whole-food meal", category: "body", xp: 20, icon: "chefHat" },
  { id: "reflect", text: "Review weekly goals for 10 min", category: "work", xp: 20, icon: "folderOpen" },
];

const CATEGORY_LABELS = {
  body: "Body",
  mind: "Mind",
  discipline: "Discipline",
  work: "Work",
  social: "Social",
};

export function categoryLabel(key) {
  return CATEGORY_LABELS[key] ?? key;
}

/** Deterministic pseudo-random from ISO date string. */
function seedFromIso(iso) {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three unique daily challenges, stable for a given calendar day. */
export function getDailyChallenges(iso) {
  const seed = seedFromIso(iso);
  const pool = [...CHALLENGE_POOL];
  const picks = [];
  let s = seed;
  while (picks.length < 3 && pool.length) {
    s = (s * 1103515245 + 12345) >>> 0;
    const idx = s % pool.length;
    picks.push({ ...pool[idx], dayKey: `${iso}:${pool[idx].id}` });
    pool.splice(idx, 1);
  }
  return picks;
}

export function countTotalChallengeCompletions(state) {
  const map = state.challengeCompletionsByDate ?? {};
  let n = 0;
  for (const day of Object.values(map)) {
    if (typeof day !== "object" || !day) continue;
    n += Object.values(day).filter(Boolean).length;
  }
  return n;
}

export function todayChallengesDone(state, iso) {
  const day = state.challengeCompletionsByDate?.[iso] ?? {};
  return Object.values(day).filter(Boolean).length;
}

export function isChallengeDone(state, iso, dayKey) {
  return !!state.challengeCompletionsByDate?.[iso]?.[dayKey];
}
