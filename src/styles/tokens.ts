export interface ThemeTokens {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  accentInk: string;
  danger: string;
}

export const lightTokens: ThemeTokens = {
  paper: '#FBFAF7',
  surface: '#F3F1EC',
  ink: '#1F1E1C',
  muted: '#6B675F',
  rule: '#E4E0D7',
  accent: '#B5432F',
  accentInk: '#FFFFFF',
  danger: '#9F2D20',
};

export const darkTokens: ThemeTokens = {
  paper: '#191817',
  surface: '#22211F',
  ink: '#ECEAE4',
  muted: '#A8A398',
  rule: '#34322E',
  accent: '#E07A5F',
  accentInk: '#191817',
  danger: '#F08A7A',
};

export const tokens = {
  light: lightTokens,
  dark: darkTokens,
} as const;

export const tokenCssVariables: Record<keyof ThemeTokens, string> = {
  paper: '--color-paper',
  surface: '--color-surface',
  ink: '--color-ink',
  muted: '--color-muted',
  rule: '--color-rule',
  accent: '--color-accent',
  accentInk: '--color-accent-ink',
  danger: '--color-danger',
};
