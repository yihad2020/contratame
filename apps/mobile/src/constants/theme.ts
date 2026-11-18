export const colors = {
  primary: '#0969DA',
  primaryPressed: '#0758B8',
  primarySoft: '#EAF3FC',
  primaryDisabled: '#8ABAEF',
  navy: '#102A43',
  navyDeep: '#0B2035',
  navySoft: '#183B5A',
  textOnDark: '#D9E6F3',
  textOnDarkMuted: '#BFD2E7',
  green: '#20C65A',
  greenPressed: '#169C45',
  greenSoft: '#EAFBF0',
  background: '#F7F9FC',
  surface: '#FFFFFF',
  authCard: 'rgba(255, 255, 255, 0.82)',
  authLogoSurface: 'rgba(255, 255, 255, 0.84)',
  authGlassBorder: 'rgba(255, 255, 255, 0.64)',
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

/**
 * UI-03 redesign tokens. Layout follows the `screen_ideas/` mockups; colours come from the
 * official brand palette (navy #0B3C7B, green #12B834, light blue #0A71C8, white, black).
 * The mockups' dark header maps to navy and their orange accent maps to light blue.
 * Auth screens keep using the UI-01 `colors` tokens above and are intentionally untouched.
 */
export const palette = {
  navy: '#0B3C7B',
  green: '#12B834',
  lightBlue: '#0A71C8',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const ui = {
  header: palette.navy,
  headerDecor: 'rgba(255, 255, 255, 0.06)',
  headerButton: 'rgba(255, 255, 255, 0.14)',
  headerText: palette.white,
  headerMuted: 'rgba(255, 255, 255, 0.80)',
  accent: palette.lightBlue,
  accentPressed: '#085EA8',
  accentSoft: '#E6F1FB',
  accentTint: '#F2F8FD',
  green: palette.green,
  greenSoft: '#E5F7E9',
  greenText: '#0C8F27',
  navy: palette.navy,
  navySoft: '#E8EEF7',
  page: '#F5F6F8',
  card: palette.white,
  ink: '#111214',
  inkSoft: '#2F3338',
  muted: '#6B7078',
  subtle: '#9BA0A7',
  tag: '#F1F2F4',
  divider: '#ECEEF1',
  field: '#F4F5F7',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  black: palette.black,
  white: palette.white,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  nav: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

export const uiRadii = { sm: 10, md: 14, lg: 18, xl: 22, xxl: 28, pill: 999 } as const;
