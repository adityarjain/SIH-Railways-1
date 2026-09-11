import React from 'react';
import { useI18n, LANGUAGES } from '../../i18n';

/**
 * EN | हिन्दी segmented control.
 *
 * Deliberately no flag and no globe icon: a flag denotes a country, not a
 * language, and this is an institutional control rather than a decorative one.
 */
export const LanguageSwitch = ({ tone = 'dark', className = '' }) => {
  const { lang, setLang, t } = useI18n();

  const base = tone === 'dark'
    ? { wrap: 'border-rail-700 bg-rail-950', idle: 'text-rail-400 hover:text-white', active: 'bg-rail-700 text-white' }
    : { wrap: 'border-line bg-surface-panel', idle: 'text-rail-500 hover:text-rail-900', active: 'bg-rail-900 text-white' };

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`flex items-stretch border shrink-0 ${base.wrap} ${className}`}
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
            className={`px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-status-info focus-visible:ring-offset-0 ${
              active ? base.active : base.idle
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};
