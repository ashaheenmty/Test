import { describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings } from './settings';

describe('settings', () => {
  it('defaults validate', () => {
    expect(loadSettings({})).toEqual(defaultSettings);
  });

  it('deep-merges overrides from SETTINGS_JSON', () => {
    const s = loadSettings({ SETTINGS_JSON: JSON.stringify({ serviceFee: { vatRateBp: 700 } }) });
    expect(s.serviceFee.vatRateBp).toBe(700);
    expect(s.serviceFee.refundableOnOperatorCancellation).toBe(true);
  });

  it('refuses to switch analytics on by default', () => {
    expect(() =>
      loadSettings({ SETTINGS_JSON: JSON.stringify({ privacy: { analyticsDefaultOn: true } }) }),
    ).toThrow();
  });
});
