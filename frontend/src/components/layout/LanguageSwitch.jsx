import React from 'react';
import { useI18n, LANGUAGES } from '../../i18n';

/**
 * EN | हिन्दी segmented control, sized for the ink provenance strip.
 *
 * Deliberately no flag and no globe icon: a flag denotes a country, not a
 * language, and this is an institutional control rather than a decorative one.
 * `tone` is accepted for old call sites and ignored.
 */
// eslint-disable-next-line no-unused-vars
export const LanguageSwitch = ({ tone, className = '' }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex items-stretch shrink-0 border border-rail-700 ${className}`}
    >
      {Object.values(LANGUAGES).map((l) => {
        const active = lang === l.id;
        return (
          <button
            key={l.id}
            type="button"
            lang={l.htmlLang}
            onClick={() => setLang(l.id)}
            aria-pressed={active}
            aria-label={t('lang.switchTo', { name: l.name })}
            className={`px-2 py-px font-mono text-[10px] font-bold transition-colors ${
              active ? 'bg-rail-700 text-white' : 'text-ws-disabled hover:text-white'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};
