/**
 * Design tokens shared by web (CSS variables), admin and mobile (React Native).
 * Calm, high-contrast palette; every text/background pair is verified against
 * WCAG 2.2 AA by src/tokens.test.ts.
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  /** Decorative dividers only (exempt from 1.4.11). */
  border: string;
  /** Input and control outlines — must reach 3:1 (WCAG 1.4.11). */
  borderStrong: string;
  primary: string;
  primaryHover: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  focusRing: string;
  /** Badge for "separate tickets" — needs to stand out without alarm. */
  noticeBg: string;
  noticeText: string;
}

export const colors: { light: ColorTokens; dark: ColorTokens } = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF0F4',
    text: '#141820',
    textMuted: '#4A5361',
    border: '#DDE2E9',
    borderStrong: '#6B7482',
    primary: '#0A5CA8',
    primaryHover: '#084B8A',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3EEFA',
    onPrimarySoft: '#073F73',
    success: '#1B7338',
    warning: '#855400',
    danger: '#B3261E',
    info: '#0A5CA8',
    focusRing: '#0A5CA8',
    noticeBg: '#FFF4D6',
    noticeText: '#5C3B00',
  },
  dark: {
    background: '#0E1116',
    surface: '#171B22',
    surfaceAlt: '#212733',
    text: '#E9EDF3',
    textMuted: '#A9B2C0',
    border: '#2C3340',
    borderStrong: '#7F8999',
    primary: '#78B8FF',
    primaryHover: '#9CCBFF',
    onPrimary: '#06182C',
    primarySoft: '#16304D',
    onPrimarySoft: '#CFE5FF',
    success: '#62D08F',
    warning: '#F3BB52',
    danger: '#FF8D84',
    info: '#78B8FF',
    focusRing: '#9CCBFF',
    noticeBg: '#3A2C0A',
    noticeText: '#FFE3A3',
  },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/** Sizes in px at 100 % text scale; mobile uses them as dp and respects dynamic type. */
export const typography = {
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans SC', sans-serif",
  size: { xs: 13, sm: 15, md: 17, lg: 20, xl: 24, xxl: 30 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  lineHeight: { tight: 1.25, normal: 1.5 },
} as const;

/** WCAG 2.5.8 requires 24px; we target the platform guidelines (Apple 44pt, Material 48dp). */
export const minTapTarget = 48;

export const motion = { fast: 120, normal: 200 } as const;

export type ThemeName = keyof typeof colors;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Renders the colour tokens as CSS custom properties, e.g. `--color-primary`. */
export function cssVariables(theme: ThemeName): string {
  return Object.entries(colors[theme])
    .map(([k, v]) => `--color-${kebab(k)}:${v};`)
    .join('');
}

/**
 * Full stylesheet fragment: light by default, dark via prefers-color-scheme,
 * explicit override via <html data-theme="light|dark">.
 */
export function themeStylesheet(): string {
  return [
    `:root{${cssVariables('light')}color-scheme:light;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${cssVariables('dark')}color-scheme:dark;}}`,
    `:root[data-theme="dark"]{${cssVariables('dark')}color-scheme:dark;}`,
  ].join('\n');
}
