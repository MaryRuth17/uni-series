import { afterEach, describe, expect, it } from 'vitest';
import en from '../../../src/i18n/en.json';
import fil from '../../../src/i18n/fil.json';
import { hasKey, setLanguage, t } from '../../../src/core/i18n';
import { ROSTER } from '../../../src/minigames/roster';

describe('i18n', () => {
  afterEach(() => setLanguage('en'));

  it('looks up keys and fills parameters', () => {
    expect(t('landing.play')).toBe("LET'S PLAY!");
    expect(t('landing.welcomeBack', { name: 'Ana' })).toBe('Welcome back, Ana!');
    expect(t('map.ipon', { ipon: 240 })).toBe('₱240');
  });

  it('falls back to English, then to the key itself', () => {
    setLanguage('fil');
    expect(t('settings.music')).toBe('Musika');
    expect(t('landing.play')).toBe('TARA, LARO!');
    // "SOON" has no Filipino entry, so it falls back to English.
    expect(t('map.soon')).toBe('SOON');
    expect(t('no.such.key')).toBe('no.such.key');
    expect(hasKey('no.such.key')).toBe(false);
  });

  it('every Filipino key exists in English', () => {
    for (const key of Object.keys(fil)) expect(Object.keys(en)).toContain(key);
  });

  it('has the title, tagline and teaser for every roster entry', () => {
    for (const r of ROSTER) {
      for (const part of ['title', 'tagline', 'teaser']) {
        expect(hasKey(`roster.${r.id}.${part}`)).toBe(true);
      }
    }
  });
});
