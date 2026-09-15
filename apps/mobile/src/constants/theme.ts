export const colors = {
  primary: '#0969DA',
  primaryPressed: '#0758B8',
  primarySoft: '#EAF3FC',
  primaryDisabled: '#8ABAEF',
  navy: '#102A43',
  green: '#20C65A',
  greenPressed: '#169C45',
  greenSoft: '#EAFBF0',
  background: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F4F8',
  text: '#10233F',
  textSecondary: '#667085',
  border: '#E4EAF1',
  borderStrong: '#CBD5E1',
  danger: '#B42318',
  dangerPressed: '#912018',
  dangerSoft: '#FEF3F2',
  warning: '#B54708',
  warningSoft: '#FFFAEB',
  success: '#15803D',
  successSoft: '#ECFDF3',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 1.2 },
} as const;

export const sizing = {
  touchTarget: 48,
  inputHeight: 56,
  buttonHeight: 54,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
  screenMaxWidth: 560,
  screenPadding: 20,
} as const;
