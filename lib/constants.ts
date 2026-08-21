import type { AnnotationElement } from "@/lib/annotations";

export const APP_NAME = "مدی‌لرن";
export const APP_TAGLINE = "پلتفرم یادگیری هوشمند پزشکی";

export const COURSE_CATEGORIES = [
  "آناتومی",
  "فیزیولوژی",
  "پاتولوژی",
  "فارماکولوژی",
  "بیوشیمی",
  "میکروبیولوژی",
  "ایمونولوژی",
  "جراحی",
  "داخلی",
  "اطفال",
  "زنان و زایمان",
  "عمومی",
] as const;

export const QUESTION_OPTIONS = ["A", "B", "C", "D"] as const;

export const OPTION_LABELS: Record<string, string> = {
  A: "گزینه ۱",
  B: "گزینه ۲",
  C: "گزینه ۳",
  D: "گزینه ۴",
};

export const ANNOTATION_TOOL_NAMES: Record<string, string> = {
  select: "انتخاب",
  pan: "جابه‌جایی",
  highlight: "هایلایت",
  pen: "قلم",
  eraser: "پاک‌کن",
};

export const ANNOTATION_COLORS: Record<string, string> = {
  yellow: "#facc15",
  blue: "#38bdf8",
  green: "#4ade80",
  red: "#f87171",
};

export const PEN_COLORS = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#38bdf8", "#818cf8", "#e879f9", "#1e293b"];

export const EMPTY_ANNOTATIONS: AnnotationElement[] = [];