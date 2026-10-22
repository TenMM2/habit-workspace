export interface Habit {
  id: string;
  name: string;
  emoji: string;
}

export interface HabitPage {
  id: string;
  title: string;
  icon: string; // emoji, se usa si no hay avatarURL
  avatarURL: string | null; // URL https o imagen comprimida (data URL)
  bannerURL: string; // 'preset:N', URL https o data URL
  quote: string;
  rules: string[];
  habits: Habit[];
}

/** Un día del tracker: users/{uid}/pages/{pageId}/days/{YYYY-MM-DD} */
export interface DayEntry {
  date: string;
  note: string;
  checks: Record<string, boolean>;
}

export type Plan = 'free' | 'pro';

export interface Profile {
  displayName: string;
  email: string;
  photoURL: string | null;
  plan: Plan;
}

export const FREE_PAGE_LIMIT = 3;
export const MAX_HABITS_PER_PAGE = 8;
