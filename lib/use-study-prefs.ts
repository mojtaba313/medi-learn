"use client";

import { useEffect, useState } from "react";
import {
  loadStudyPrefs,
  PREFS_EVENT,
  type StudyPrefs,
} from "@/lib/study-prefs";

export function useStudyPrefs() {
  const [prefs, setPrefs] = useState<StudyPrefs>(() => loadStudyPrefs());

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<StudyPrefs>).detail;
      setPrefs(detail ?? loadStudyPrefs());
    };
    window.addEventListener(PREFS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(PREFS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return prefs;
}
