import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { hi } from './hi';

/**
 * Presentation-layer translation.
 *
 * Only UI copy passes through here. Technical identifiers — task/train/section/
 * team ids, block ids, timestamps, dataset and artifact filenames, solver and
 * model names inside provenance — are rendered verbatim from the artifacts and
 * are never keyed for translation.
 */

export const LANGUAGES = {
  en: { id: 'en', label: 'EN', htmlLang: 'en', name: 'English' },
  hi: { id: 'hi', label: 'हिन्दी', htmlLang: 'hi', name: 'हिन्दी' },
};

const BUNDLES = { en, hi };
const STORAGE_KEY = 'rmo.lang';

const I18nContext = createContext(null);

/** Dot-path lookup: "nav.overview" -> bundle.nav.overview */
const lookup = (bundle, key) => {
  let node = bundle;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
};

/** {count} / {name} style interpolation. Values are inserted verbatim. */
const interpolate = (template, vars) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
};

const readStored = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && BUNDLES[stored] ? stored : 'en';
  } catch {
    // Private browsing / blocked storage: fall back to the default language.
    return 'en';
  }
};

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(readStored);

  const setLang = useCallback((next) => {
    if (!BUNDLES[next]) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience; a failed write must not break the switch.
    }
  }, []);

  // Keep the document language in sync for assistive tech and font selection.
  useEffect(() => {
    document.documentElement.lang = LANGUAGES[lang].htmlLang;
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  /**
   * Translate a key. A missing Hindi string falls back to English, and a key
   * missing from both renders its last path segment as readable text rather
   * than leaking "nav.overview" or undefined into the interface.
   */
  const t = useCallback(
    (key, vars) => {
      if (!key) return '';
      const hit = lookup(BUNDLES[lang], key) ?? lookup(en, key);
      if (hit === undefined) {
        if (import.meta.env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing key: ${key}`);
        }
        const tail = key.split('.').pop().replace(/[_-]/g, ' ');
        return interpolate(tail.charAt(0).toUpperCase() + tail.slice(1), vars);
      }
      return interpolate(hit, vars);
    },
    [lang],
  );

  /** True when the active bundle has its own string (not an English fallback). */
  const has = useCallback((key) => lookup(BUNDLES[lang], key) !== undefined, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, has, isHindi: lang === 'hi' }), [lang, setLang, t, has]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Keeps isolated renders (e.g. the style guide) working without a provider.
    return { lang: 'en', setLang: () => {}, t: (k, v) => interpolate(lookup(en, k) ?? k, v), has: () => false, isHindi: false };
  }
  return ctx;
};

/** Count of leaf strings in a bundle — used by the key-coverage test. */
export const countKeys = (bundle) => {
  let n = 0;
  const walk = (node) => {
    for (const v of Object.values(node)) {
      if (typeof v === 'string') n += 1;
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(bundle);
  return n;
};

export { en, hi };
