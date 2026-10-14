// Design tokens. Screens read these through `useThemeColor` (components/Themed.tsx),
// so every key must exist in both `light` and `dark`.

const tintColorLight = '#0D9488';
const tintColorDark = '#2DD4BF';

const light = {
  text: '#0F172A',
  muted: '#64748B',
  background: '#FFFFFF',
  /** Grouped content on the background (cards, inputs). */
  card: '#F1F5F9',
  /** Sheets and floating controls over the map. */
  elevated: '#FFFFFF',
  border: '#E2E8F0',
  /** Pressed-state and skeleton fill. */
  fill: '#E2E8F0',
  tint: tintColorLight,
  onTint: '#FFFFFF',
  tabIconDefault: '#94A3B8',
  tabIconSelected: tintColorLight,

  // Status system: open/clean, customers-only/code-locked, closed/flagged, unknown.
  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#C53030',
  dangerSoft: '#FFE4E1',
  neutral: '#64748B',
  neutralSoft: '#E2E8F0',
  star: '#F59E0B',
  starOff: '#CBD5E1',
};

const dark: typeof light = {
  text: '#F8FAFC',
  muted: '#94A3B8',
  background: '#000000',
  card: '#1E293B',
  elevated: '#111827',
  border: '#334155',
  fill: '#334155',
  tint: tintColorDark,
  onTint: '#042F2E',
  tabIconDefault: '#64748B',
  tabIconSelected: tintColorDark,

  success: '#34D399',
  successSoft: '#064E3B',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  neutral: '#94A3B8',
  neutralSoft: '#1E293B',
  star: '#FBBF24',
  starOff: '#475569',
};

export default { light, dark };

export type ColorName = keyof typeof light;

/** Map pins draw on the map in both themes, so they use one fixed set of saturated colors. */
export const PinColors = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC4C4C',
  neutral: '#64748B',
};

/** The "I need to go NOW" button is the one loud red in the app. */
export const emergencyRed = '#DC2626';
