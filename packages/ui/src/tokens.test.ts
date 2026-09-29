import { describe, expect, it } from 'vitest';
import { colors, contrastRatio, themeStylesheet, type ColorTokens } from './index';

type Pair = [keyof ColorTokens, keyof ColorTokens, number];

// [foreground, background, minimum ratio]
const TEXT = 4.5; // WCAG 1.4.3 normal text
const UI = 3; // WCAG 1.4.11 non-text contrast
const pairs: Pair[] = [
  ['text', 'background', TEXT],
  ['text', 'surface', TEXT],
  ['text', 'surfaceAlt', TEXT],
  ['textMuted', 'background', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'surfaceAlt', TEXT],
  ['primary', 'background', TEXT],
  ['primary', 'surface', TEXT],
  ['onPrimary', 'primary', TEXT],
  ['onPrimary', 'primaryHover', TEXT],
  ['onPrimarySoft', 'primarySoft', TEXT],
  ['success', 'surface', TEXT],
  ['warning', 'surface', TEXT],
  ['danger', 'surface', TEXT],
  ['info', 'surface', TEXT],
  ['noticeText', 'noticeBg', TEXT],
  ['borderStrong', 'surface', UI],
  ['borderStrong', 'background', UI],
  ['focusRing', 'background', UI],
  ['focusRing', 'surface', UI],
];

describe.each(['light', 'dark'] as const)('%s theme meets WCAG 2.2 AA', (theme) => {
  it.each(pairs)('%s on %s ≥ %d:1', (fg, bg, min) => {
    const ratio = contrastRatio(colors[theme][fg], colors[theme][bg]);
    expect(ratio, `${theme} ${fg}/${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });
});

describe('contrastRatio', () => {
  it('computes the known black/white ratio', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});

describe('themeStylesheet', () => {
  it('supports system preference and explicit overrides', () => {
    const css = themeStylesheet();
    expect(css).toContain('--color-primary:#0A5CA8;');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain(':root[data-theme="dark"]');
  });
});
