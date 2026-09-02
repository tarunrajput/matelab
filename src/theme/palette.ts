/**
 * Semantic color tokens for MateLab. Components never hardcode hex values —
 * they read `colors` from useTheme() and both palettes below map every token.
 * The dark palette is the app's original look; the light palette is a
 * warm-paper counterpart in the same hue family (amber accent, brown board),
 * with darker tonal variants of accent/status colors so text stays >= 4.5:1.
 */

export interface ThemeColors {
  /** Screen background */
  bg: string;
  /** Cards, sheets, dialogs, tab bar */
  card: string;
  /** Buttons, stat boxes, inactive control fills */
  cardAlt: string;
  /** Wells that read as pressed-in: inputs, coach tips, eval graph */
  sunken: string;
  /** Hairlines around cards/chips */
  border: string;
  /** Stronger separators: slider track, eval-bar frame, board frame, inactive bars */
  borderStrong: string;

  /** Primary text and button labels */
  text: string;
  /** Secondary body text */
  textDim: string;
  /** Meta labels */
  textMuted: string;
  /** Hints, dates, footnotes */
  textFaint: string;
  /** Placeholder-level text */
  textGhost: string;

  /** Brand amber fill: active chips, slider, primary buttons */
  accent: string;
  /** Amber used as text/icon, tuned for contrast on bg/card */
  accentText: string;
  /** Text on top of accent fills */
  onAccent: string;

  /** Success text (solved, best move) */
  success: string;
  /** Mistake accents (dot, tip border, worst-move text) */
  warn: string;
  /** Inaccuracy dot */
  inaccuracy: string;
  /** Blunder dot, failed text, flag border */
  danger: string;
  /** Danger as text on bg/card (flagged clock, delete button) */
  dangerText: string;
  /** Danger-tinted fills (flagged clock, delete button) */
  dangerBg: string;
  dangerBorder: string;
  /** Amber-tinted fill behind the running clock */
  clockActiveBg: string;

  /** Inactive progress/slider track */
  track: string;
  /** Modal overlays */
  scrim: string;
}

export const darkColors: ThemeColors = {
  bg: '#101014',
  card: '#1c1c22',
  cardAlt: '#232329',
  sunken: '#15151a',
  border: '#2e2e33',
  borderStrong: '#3a3a40',

  text: '#f5f5f7',
  textDim: '#c9c9d1',
  textMuted: '#9b9ba3',
  textFaint: '#7e7e88',
  textGhost: '#6c6c77',

  accent: '#f5a623',
  accentText: '#f5a623',
  onAccent: '#101014',

  success: '#4ade80',
  warn: '#e69a2a',
  inaccuracy: '#f7c631',
  danger: '#e04040',
  dangerText: '#ff6b6b',
  dangerBg: '#2a1515',
  dangerBorder: '#4a2020',
  clockActiveBg: '#23230f',

  track: '#3a3a40',
  scrim: 'rgba(0, 0, 0, 0.55)',
};

export const lightColors: ThemeColors = {
  bg: '#f4f2ee',
  card: '#ffffff',
  cardAlt: '#eae7e0',
  sunken: '#efece4',
  border: '#ddd8cd',
  borderStrong: '#c7c1b3',

  text: '#26241f',
  textDim: '#4b4842',
  textMuted: '#67635a',
  textFaint: '#6f6960',
  textGhost: '#8f887b',

  accent: '#f5a623',
  accentText: '#8a5c00',
  onAccent: '#1f1a10',

  success: '#146c36',
  warn: '#b45309',
  inaccuracy: '#a37f00',
  danger: '#c62828',
  dangerText: '#c62828',
  dangerBg: '#f9e4e2',
  dangerBorder: '#e6b7b3',
  clockActiveBg: '#faeecd',

  track: '#d5cfc1',
  scrim: 'rgba(0, 0, 0, 0.45)',
};

import type { Classification } from '../game/useChessGame';

/** Shared blunder/mistake/inaccuracy color mapping used by MoveList and CoachSheet. */
export function classificationColor(classification: Classification, c: ThemeColors): string {
  switch (classification) {
    case 'blunder': return c.danger;
    case 'mistake': return c.warn;
    case 'inaccuracy': return c.inaccuracy;
  }
}
