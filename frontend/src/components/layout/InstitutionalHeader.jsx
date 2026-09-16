import React from 'react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from './LanguageSwitch';

/**
 * Government identity band — the upper level of a two-level header.
 *
 * Text only, by deliberate choice. No emblem or logo asset is shipped:
 *
 *  - The State Emblem of India is restricted by the State Emblem of India
 *    (Prohibition of Improper Use) Act, 2005. Use by a non-government project
 *    would imply official authorization this prototype does not have.
 *  - No verified official Indian Railways / Ministry of Railways asset was
 *    available from an authoritative source, and an unofficial copy would be
 *    both a licensing risk and a provenance one.
 *
 * The bilingual name pairs are the identity instead, and the prototype
 * disclaimer sits alongside them so the status of the system is never implied
 * to be more than it is.
 */

const NamePair = ({ hi, en }) => (
  <span className="font-display leading-none whitespace-nowrap">
    <span lang="hi" className="text-[11px] font-medium text-white">{hi}</span>
    <span className="text-[10px] text-rail-400 tracking-wide"> · {en}</span>
  </span>
);

export const InstitutionalHeader = () => {
  const { t } = useI18n();

  return (
    <div className="bg-rail-950 border-b border-rail-800 px-5 py-[5px] flex items-center gap-4 flex-wrap">
      {/* Government → Ministry, each as a Hindi/English pair. */}
      <NamePair hi={t('institution.govHi')} en={t('institution.gov')} />
      <span className="h-3 w-px bg-rail-800 shrink-0" aria-hidden="true" />
      <NamePair hi={t('institution.ministryHi')} en={t('institution.ministry')} />

      <span className="flex-1 min-w-2" />

      <span className="text-[9px] text-rail-500 tracking-wide hidden lg:inline" title={t('institution.prototypeLong')}>
        {t('institution.prototype')}
      </span>
      <LanguageSwitch tone="dark" />
    </div>
  );
};

/** Application identity — the lower level. Set in the interface's own type. */
export const AppIdentity = ({ sub }) => {
  const { t, isHindi } = useI18n();
  return (
    <div className="min-w-0 flex items-baseline gap-2.5">
      <span className={`font-display text-white font-semibold uppercase truncate ${isHindi ? 'text-[12px] tracking-[0.06em]' : 'text-[11px] tracking-[0.14em]'}`}>
        {t('institution.appName')}
      </span>
      <span className="w-px h-[10px] bg-rail-700 shrink-0 hidden sm:block" aria-hidden="true" />
      <span className="font-ws text-rail-400 font-medium text-[10px] tracking-wide truncate hidden sm:inline">
        {sub || t('institution.appSub')}
      </span>
    </div>
  );
};
