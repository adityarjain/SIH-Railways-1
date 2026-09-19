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

  // Sunken track, raised active segment: the same control shape as the role
  // switch and the in-page segmented controls, so all three read as one family.
  const base = tone === 'dark'
    ? { wrap: 'bg-rail-800', idle: 'text-rail-300 hover:text-white', active: 'bg-rail-600 text-white' }
    : { wrap: 'bg-ws-tick', idle: 'text-ws-mid hover:text-ws-ink', active: 'bg-ws-surface text-ws-ink shadow-soft' };

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex items-stretch gap-0.5 rounded-md p-0.5 shrink-0 ${base.wrap} ${className}`}
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
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40 ${
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
