/** @typedef {{ type?: string; title: string; body?: string; icon?: string }} ToastPayload */

/** @param {HTMLElement | null | undefined} input */
export function fieldContainer(input) {
  if (!input) return null;
  return input.closest(".field") ?? input.closest(".row--form") ?? input.parentElement;
}

/** @param {HTMLElement | null | undefined} input @param {string} message */
export function showInlineError(input, message) {
  if (!input) return;
  clearInlineError(input);
  input.classList.add("input-invalid");
  input.setAttribute("aria-invalid", "true");
  const err = document.createElement("p");
  err.className = "field-error";
  err.setAttribute("role", "alert");
  err.textContent = message;
  fieldContainer(input)?.appendChild(err);
}

/** @param {HTMLElement | null | undefined} input */
export function clearInlineError(input) {
  if (!input) return;
  input.classList.remove("input-invalid");
  input.removeAttribute("aria-invalid");
  fieldContainer(input)?.querySelectorAll(".field-error").forEach((n) => n.remove());
}

/** @param {string} text */
export function validateQuestText(text) {
  const t = text.trim();
  if (!t) return { ok: false, message: "Enter a quest name." };
  if (t.length < 2) return { ok: false, message: "Quest name must be at least 2 characters." };
  return { ok: true, value: t.slice(0, 120) };
}

/** @param {string} raw */
export function validateDisplayName(raw) {
  const t = raw.trim();
  if (!t) return { ok: true, value: "" };
  if (t.length < 2) return { ok: false, message: "Name must be at least 2 characters." };
  return { ok: true, value: t.slice(0, 40) };
}

/** @param {string} raw */
export function validateSignupName(raw) {
  const t = raw.trim();
  if (!t) return { ok: false, message: "Enter your name." };
  if (t.length < 2) return { ok: false, message: "Name must be at least 2 characters." };
  return { ok: true, value: t.slice(0, 40) };
}

/** @param {string} raw */
export function validateEmail(raw) {
  const t = raw.trim().toLowerCase();
  if (!t) return { ok: false, message: "Enter your email." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return { ok: false, message: "Enter a valid email address." };
  return { ok: true, value: t.slice(0, 120) };
}

/** @param {string} raw */
export function validatePassword(raw) {
  if (!raw || raw.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  return { ok: true, value: raw };
}

/** @param {string} raw */
export function validateHabitLabel(raw) {
  const t = raw.trim();
  if (!t) return { ok: false, message: "Habit name cannot be empty." };
  return { ok: true, value: t.slice(0, 72) };
}

/** @param {string} raw */
export function validateWeeklyHoursGoal(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, message: "Enter a valid number of hours." };
  if (n < 5 || n > 80) return { ok: false, message: "Weekly goal must be between 5 and 80 hours." };
  return { ok: true, value: Math.round(n) };
}

/** @param {string} raw */
export function validateMonthlyIncomeGoal(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, message: "Enter a valid income goal." };
  if (n < 0) return { ok: false, message: "Income goal cannot be negative." };
  return { ok: true, value: Math.round(n) };
}

/** @param {string} raw */
export function validateWorkHoursToday(raw) {
  if (raw === "" || raw === null) return { ok: true, value: 0 };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, message: "Enter valid hours (0–24)." };
  if (n < 0 || n > 24) return { ok: false, message: "Hours must be between 0 and 24." };
  return { ok: true, value: Math.round(n * 4) / 4 };
}

/** @param {string} raw */
export function validateIncomeToday(raw) {
  if (raw === "" || raw === null) return { ok: true, value: 0 };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, message: "Enter a valid income amount." };
  if (n < 0) return { ok: false, message: "Income cannot be negative." };
  return { ok: true, value: Math.max(0, Math.round(n)) };
}

/** @param {string} raw */
export function validateProgramWeek(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, message: "Pick a week between 1 and 12." };
  if (n < 1 || n > 12) return { ok: false, message: "Program week must be 1–12." };
  return { ok: true, value: Math.round(n) };
}

/** @param {string} raw @param {string} part */
export function validateExerciseField(raw, part) {
  const n = Number(raw);
  if (part === "name") {
    const t = String(raw).trim();
    if (!t) return { ok: false, message: "Lift name is required." };
    return { ok: true, value: t.slice(0, 80) };
  }
  if (!Number.isFinite(n)) return { ok: false, message: "Enter a valid number." };
  if (part === "kg") {
    if (n < 0) return { ok: false, message: "Weight cannot be negative." };
    return { ok: true, value: n };
  }
  if (part === "reps") {
    if (n < 1 || n > 100) return { ok: false, message: "Reps must be 1–100." };
    return { ok: true, value: Math.round(n) };
  }
  if (part === "sets") {
    if (n < 1 || n > 15) return { ok: false, message: "Sets must be 1–15." };
    return { ok: true, value: Math.round(n) };
  }
  return { ok: true, value: n };
}
