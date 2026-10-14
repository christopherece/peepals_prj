import type { TextStyle } from 'react-native';

/**
 * Type scale, modeled on the iOS text styles. Use through `<Text type="...">` (components/Themed.tsx).
 * Place names use `title`; distances, timestamps and metadata use `footnote`/`caption` with `muted`.
 */
export const Type = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} satisfies Record<string, TextStyle>;

export type TypeName = keyof typeof Type;

export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
