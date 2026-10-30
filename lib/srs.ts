const DAY_MS = 24 * 60 * 60 * 1000;

export type SrsGrade = "again" | "good" | "easy";

export interface SrsState {
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  due: Date;
  last: Date | null;
}

export function isCardDue(state: Pick<SrsState, "due"> | null | undefined) {
  return !state || state.due.getTime() <= Date.now();
}

export function gradeFlashcard(
  previous: SrsState | null | undefined,
  grade: SrsGrade,
): SrsState {
  const now = Date.now();
  const card: SrsState = {
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    due: new Date(now),
    last: null,
    ...(previous ?? {}),
  };

  if (grade === "again") {
    return {
      ...card,
      interval: 0,
      reps: 0,
      lapses: card.lapses + 1,
      ease: Math.max(1.3, card.ease - 0.2),
      due: new Date(now + 10 * 60 * 1000),
      last: new Date(now),
    };
  }

  const ease = grade === "easy" ? Math.min(3, card.ease + 0.15) : card.ease;
  let interval: number;

  if (card.reps === 0) {
    interval = grade === "easy" ? 2 : 1;
  } else if (card.reps === 1) {
    interval = grade === "easy" ? 4 : 3;
  } else {
    interval = Math.max(
      1,
      Math.round(card.interval * ease * (grade === "easy" ? 1.3 : 1)),
    );
  }

  return {
    ...card,
    reps: card.reps + 1,
    ease,
    interval,
    due: new Date(now + interval * DAY_MS),
    last: new Date(now),
  };
}
