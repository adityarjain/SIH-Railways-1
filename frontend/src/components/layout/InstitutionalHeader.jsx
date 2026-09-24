import React, { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from './LanguageSwitch';

/**
 * Application chrome shared by every role: provenance strip, tab navigation
 * and footer.
 *
 * Identity is text only, and says what the system is rather than who owns
 * it: no emblem, logo or seal, and nothing implying government authorization
 * (the State Emblem is restricted by the State Emblem of India (Prohibition
 * of Improper Use) Act, 2005). The strip and footer both state that this is
 * a demonstration prototype.
 */

const Divider = () => <span className="hidden sm:block w-px h-3 bg-rail-700" aria-hidden="true" />;

/** Ink provenance strip: what this is, and that it is a prototype. */
export const TopBar = () => {
  const { t } = useI18n();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-overlay focus:bg-ws-surface focus:text-ws-ink focus:px-3 focus:py-2 text-sm font-semibold"
      >
        {t('institution.skipToContent')}
      </a>
      <div className="print:hidden bg-ws-ink min-h-[26px] py-[3px] px-3.5 md:px-4 xl:px-5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="t-wordmark text-white">{t('institution.appName')}</span>
        <Divider />
        <span className="hidden sm:inline t-wordmark-sub text-ws-disabled">{t('institution.appSub')}</span>
        <span className="flex-1" />
        <span className="hidden md:inline font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ws-disabled">
          {t('institution.prototype')}
        </span>
        <LanguageSwitch />
      </div>
    </>
  );
};

/** Strip with nothing else, for pages outside the app shell. */
export const InstitutionalHeader = () => <TopBar />;

/**
 * Horizontal tab navigation at every width. Active: ink text over a 2px ink
 * rule; hover: a rule-coloured underline. Scrolls sideways, never wraps.
 * `groups`: [{ label, items: [{ id, label }] }].
 */
export const TabNav = ({ groups, activeId, onSelect, label }) => {
  // On narrow screens the strip scrolls; keep the current tab in view.
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);
  return (
  <nav ref={ref} aria-label={label} className="print:hidden bg-ws-surface border-b border-ws-rule overflow-x-auto custom-scrollbar">
    <div className="flex gap-5 px-3.5 md:px-4 xl:px-5 whitespace-nowrap">
      {groups.flatMap((g) => g.items).map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect && onSelect(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 pt-2.5 pb-2 -mb-px border-b-2 font-display text-[14px] font-semibold uppercase tracking-[0.06em] transition-colors ${
              active ? 'border-ws-ink text-ws-ink' : 'border-transparent text-ws-mid hover:text-ws-ink hover:border-ws-rule'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
  );
};

/** Band footer carrying the non-official disclaimer. */
export const AppFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="print:mt-4 mt-10 bg-ws-band border-t border-ws-rule px-3.5 md:px-4 xl:px-5 py-3">
      <p className="font-mono text-[10px] text-ws-mid leading-relaxed max-w-4xl">{t('institution.prototypeLong')}</p>
    </footer>
  );
};
