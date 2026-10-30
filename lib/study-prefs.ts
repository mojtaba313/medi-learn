export const PREFS_STORAGE_KEY = "medilearnStudyPrefs.v1";
export const PREFS_EVENT = "medilearn-prefs-change";

export interface StudyPrefs {
  theme: "dark" | "light";
  fontSize: "sm" | "md" | "lg";
  lineHeight: "normal" | "relaxed";
  readingWidth: "narrow" | "normal" | "wide";
  dailyGoalMinutes: number;
  pomodoroFocus: number;
  pomodoroBreak: number;
}

export const DEFAULT_PREFS: StudyPrefs = {
  theme: "dark",
  fontSize: "md",
  lineHeight: "normal",
  readingWidth: "normal",
  dailyGoalMinutes: 60,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

export function normalizePrefs(value: unknown): StudyPrefs {
  const source = value && typeof value === "object" ? (value as Partial<StudyPrefs>) : {};
  return {
    theme: source.theme === "light" ? "light" : "dark",
    fontSize: source.fontSize === "sm" || source.fontSize === "lg" ? source.fontSize : "md",
    lineHeight: source.lineHeight === "relaxed" ? "relaxed" : "normal",
    readingWidth:
      source.readingWidth === "narrow" || source.readingWidth === "wide"
        ? source.readingWidth
        : "normal",
    dailyGoalMinutes: clampNumber(
      source.dailyGoalMinutes,
      DEFAULT_PREFS.dailyGoalMinutes,
      5,
      600,
    ),
    pomodoroFocus: clampNumber(
      source.pomodoroFocus,
      DEFAULT_PREFS.pomodoroFocus,
      5,
      120,
    ),
    pomodoroBreak: clampNumber(
      source.pomodoroBreak,
      DEFAULT_PREFS.pomodoroBreak,
      1,
      60,
    ),
  };
}

export function loadStudyPrefs(): StudyPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    return normalizePrefs(JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveStudyPrefs(prefs: StudyPrefs) {
  if (typeof window === "undefined") return;
  const normalized = normalizePrefs(prefs);
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: normalized }));
}
