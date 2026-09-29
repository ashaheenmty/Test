import { describe, expect, it } from 'vitest';
import { IntlMessageFormat } from 'intl-messageformat';
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import {
  createI18n,
  dir,
  flattenMessages,
  formatDate,
  formatTime,
  isRtl,
  LOCALES,
  matchLocale,
  resources,
  SUPPORTED_LOCALES,
} from './index';

const reference = flattenMessages(resources.de);

function variables(elements: MessageFormatElement[], acc = new Set<string>()): Set<string> {
  for (const el of elements) {
    if ('value' in el && el.type !== TYPE.literal && typeof el.value === 'string') acc.add(el.value);
    if ('options' in el) {
      for (const opt of Object.values(el.options)) variables(opt.value, acc);
    }
  }
  return acc;
}

describe.each(SUPPORTED_LOCALES)('locale %s', (locale) => {
  const messages = flattenMessages(resources[locale]);

  it('has exactly the same keys as German (source language)', () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(reference).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('every message is valid ICU and uses the same variables as German', () => {
    for (const [key, value] of Object.entries(messages)) {
      const ast = parse(value);
      expect([...variables(ast)].sort(), `${locale}:${key}`).toEqual(
        [...variables(parse(reference[key]!))].sort(),
      );
      expect(() => new IntlMessageFormat(value, LOCALES[locale].intlLocale)).not.toThrow();
    }
  });
});

describe('runtime', () => {
  it('interpolates and pluralises with ICU', () => {
    const en = createI18n('en');
    expect(en.t('home.passengers', { count: 1 })).toBe('1 traveller');
    expect(en.t('home.passengers', { count: 3 })).toBe('3 travellers');
    const ru = createI18n('ru');
    expect(ru.t('home.passengers', { count: 5 })).toBe('5 пассажиров');
    const ar = createI18n('ar');
    expect(ar.t('home.passengers', { count: 2 })).toBe('مسافران');
  });

  it('injects default variables (brand name)', () => {
    const t = createI18n('de', { defaultVariables: { brand: 'Umsteiger' } }).t;
    expect(t('onboarding.welcome')).toBe('Willkommen bei Umsteiger');
  });

  it('applies overrides from the admin translation editor', () => {
    const t = createI18n('en', { overrides: { en: { home: { title: 'Where next?' } } } }).t;
    expect(t('home.title')).toBe('Where next?');
    expect(t('home.from')).toBe('From');
  });

  it('marks only Arabic as right-to-left', () => {
    expect(isRtl('ar')).toBe(true);
    expect(dir('ar')).toBe('rtl');
    expect(SUPPORTED_LOCALES.filter(isRtl)).toEqual(['ar']);
  });

  it('matches Accept-Language headers and device locales', () => {
    expect(matchLocale('fr-CH,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(matchLocale('it-IT,en;q=0.5')).toBe('en');
    expect(matchLocale('zh-CN')).toBe('zh-Hans');
    expect(matchLocale(['ar-EG'])).toBe('ar');
    expect(matchLocale('ja')).toBe('de');
    expect(matchLocale(undefined)).toBe('de');
  });

  it('formats dates and times in Europe/Berlin with Latin digits for Arabic', () => {
    const d = new Date('2026-12-24T17:05:00Z');
    expect(formatTime(d, 'de')).toBe('18:05');
    expect(formatTime(d, 'ar')).toMatch(/18:05/);
    expect(formatDate(d, 'de', { dateStyle: 'short' })).toBe('24.12.26');
  });
});
