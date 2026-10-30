export interface LessonData {
  id: string;
  slug: string;
  order: number;
  title: string;
  mins: string | null;
  source: string | null;
  summary: string | null;
  html: string;
}

export interface GalleryCollection {
  id: string;
  label: string;
  unit: string;
  pageCount: number;
  pad: number;
  file: string;
}

export interface GalleryData {
  title: string;
  intro: string;
  callout?: string;
  collections: GalleryCollection[];
}

export interface ModuleData {
  id: string;
  title: string;
  cardTitle: string;
  cardDescription: string | null;
  eyebrow: string | null;
  description: string;
  pills: string[];
  footer: string | null;
  gallery: GalleryData | null;
  referencesTitle: string | null;
  referencesIntro: string | null;
  referencesHtml: string | null;
  quizTitle: string | null;
  quizDescription: string | null;
  quizNavLabel: string | null;
}

export interface QuestionData {
  id: string;
  order: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
  topic: string | null;
}

export interface FlashcardData {
  id: string;
  order: number;
  term: string;
  definition: string;
}

export interface ReviewData {
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  due: string;
  last: string | null;
}

export interface AttemptAnswer {
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  timeSpentMs: number;
}

export interface AttemptData {
  id: string;
  mode: string;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  answers: AttemptAnswer[];
  topicStats: Record<string, { correct: number; total: number }> | null;
  wrongQuestionIds: string[];
  createdAt: string;
}

export interface ResponseData {
  selectedOption: string | null;
  isCorrect: boolean | null;
}
