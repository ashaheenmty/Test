import { loadSettings } from '@tb/config';

export const SETTINGS = Symbol('SETTINGS');

export const settingsProvider = { provide: SETTINGS, useFactory: () => loadSettings() };
