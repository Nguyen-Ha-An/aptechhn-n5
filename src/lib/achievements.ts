export const ACHIEVEMENT_IDS = [
  'first_session',
  'focus_marathon',
  'streak_3',
  'streak_7',
  'note_taker',
  'closer',
  'undistracted',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface AchievementMeta {
  readonly title: string;
  readonly description: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementMeta> = {
  first_session: {
    title: 'First steps',
    description: 'Finish your first focus session.',
  },
  focus_marathon: {
    title: 'Focus marathon',
    description: 'Reach 100 focused minutes in total.',
  },
  streak_3: {
    title: 'Consistent',
    description: 'Focus on 3 days in a row.',
  },
  streak_7: {
    title: 'Week warrior',
    description: 'Focus on 7 days in a row.',
  },
  note_taker: {
    title: 'Note taker',
    description: 'Keep 10 pages.',
  },
  closer: {
    title: 'Closer',
    description: 'Complete 25 todos.',
  },
  undistracted: {
    title: 'Undistracted',
    description: 'Focus for 25 minutes or more without logging a distraction.',
  },
};
