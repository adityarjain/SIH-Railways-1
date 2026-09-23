import React from 'react';
import { useI18n, LANGUAGES } from '../../i18n';

/**
 * EN | हिन्दी segmented control.
 *
 * Deliberately no flag and no globe icon: a flag denotes a country, not a
 * language, and this is an institutional control rather than a decorative one.
 */
export const LanguageSwitch = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex items-center gap-3 shrink-0 ${className}`}
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
            className={`py-1 border-b-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ease-out focus:outline-none focus-visible:shadow-focus ${active ? 'border-accent-bright text-ws-ink' : 'border-transparent text-ws-mid hover:text-ws-ink'}`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};
