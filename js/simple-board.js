import { loadState, saveState } from "./storage.js";
import { rankFromXp } from "./logic.js";

/** Same reward as Board side quests (`app.js`). */
const QUEST_XP = 10;

const LEGACY_KEY = "levelup_simple_quests_v1";
const MIGRATE_FLAG = "levelup_simple_migrated_v1";

function uid() {
  return crypto.randomUUID?.() ?? `q_${Math.random().toString(36).slice(2)}`;
}

/**
 * One-time import from the old standalone simple.html storage key.
 */
function maybeMigrateLegacySimple(state) {
  if (localStorage.getItem(MIGRATE_FLAG)) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const legacyQuests = Array.isArray(data.quests) ? data.quests : [];
    const legacyXp = Number(data.xp) || 0;
    if (!Array.isArray(state.quests)) state.quests = [];
    const ids = new Set(state.quests.map((q) => q.id));
    for (const q of legacyQuests) {
      const id = typeof q.id === "string" && q.id ? q.id : uid();
      if (ids.has(id)) continue;
      ids.add(id);
      state.quests.push({
        id,
        text: String(q.text ?? "").slice(0, 200),
        done: !!q.done,
      });
    }
    state.xpTotal = Math.max(Number(state.xpTotal) || 0, legacyXp);
    localStorage.removeItem(LEGACY_KEY);
    saveState(state);
  } catch {
    /* ignore corrupt legacy */
  } finally {
    localStorage.setItem(MIGRATE_FLAG, "1");
  }
}

/** @type {ReturnType<typeof loadState>} */
let state = loadState();
maybeMigrateLegacySimple(state);
state = loadState();

const xpEl = document.getElementById("xp");
const rankEl = document.getElementById("level");
const detailEl = document.getElementById("level-detail");
const barEl = document.getElementById("xpBar");
const listEl = document.getElementById("list");
const inputEl = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");

function syncUi() {
  const xp = Math.max(0, Number(state.xpTotal) || 0);
  xpEl.textContent = String(xp);
  const rank = rankFromXp(xp);
  rankEl.textContent = rank.label;
  const prev = rank.prevAt ?? 0;
  const next = rank.nextAt;
  if (next === null) {
    detailEl.textContent = " — top bracket in this build";
    barEl.style.width = "100%";
  } else {
    const span = Math.max(1, next - prev);
    const into = xp - prev;
    const remaining = Math.max(0, next - xp);
    detailEl.textContent = ` — ${into} / ${span} toward next rank (${remaining} XP left)`;
    barEl.style.width = `${Math.min(100, Math.round((into / span) * 100))}%`;
  }
}

function renderList() {
  const qs = Array.isArray(state.quests) ? state.quests : [];
  listEl.replaceChildren();
  qs.forEach((quest) => {
    const li = document.createElement("li");
    li.textContent = quest.text + (quest.done ? "" : ` (+${QUEST_XP} XP)`);
    if (quest.done) li.classList.add("done");
    li.addEventListener("click", () => completeQuest(quest.id));
    listEl.appendChild(li);
  });
}

function persist() {
  saveState(state);
  syncUi();
  renderList();
}

function completeQuest(id) {
  const qs = Array.isArray(state.quests) ? state.quests : [];
  const q = qs.find((x) => x.id === id);
  if (!q || q.done) return;
  q.done = true;
  state.xpTotal = Math.max(0, Number(state.xpTotal) || 0) + QUEST_XP;
  persist();
}

function addTask() {
  const text = inputEl.value.trim();
  if (!text) return;
  if (!Array.isArray(state.quests)) state.quests = [];
  state.quests.push({ id: uid(), text: text.slice(0, 120), done: false });
  inputEl.value = "";
  persist();
}

addBtn.addEventListener("click", addTask);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});

syncUi();
renderList();
