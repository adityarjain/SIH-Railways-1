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

const NamePair = ({ hi, en, strong = false }) => (
  <div className="leading-tight">
    <div lang="hi" className={`${strong ? 'text-[12px] font-semibold' : 'text-[11px] font-medium'} text-white`}>
      {hi}
    </div>
    <div className={`${strong ? 'text-[10px]' : 'text-[9px]'} text-rail-400 tracking-wide`}>{en}</div>
  </div>
);

export const InstitutionalHeader = ({ compact = false }) => {
  const { t } = useI18n();

  return (
    <div className="bg-rail-950 border-b border-rail-800">
      <div className="px-5 py-2 flex items-center gap-5 flex-wrap">
        {/* Government → Ministry → Railways, each as a Hindi/English pair. */}
        <div className="flex items-center gap-5 min-w-0">
          <NamePair hi={t('institution.govHi')} en={t('institution.gov')} />
          <span className="h-7 w-px bg-rail-800 shrink-0" aria-hidden="true" />
          <NamePair hi={t('institution.ministryHi')} en={t('institution.ministry')} />
          {!compact && (
            <>
              <span className="h-7 w-px bg-rail-800 shrink-0 hidden md:block" aria-hidden="true" />
              <div className="hidden md:block">
                <NamePair hi={t('institution.railwaysHi')} en={t('institution.railways')} strong />
              </div>
            </>
          )}
        </div>

        <div className="flex-1" />

        <span className="text-[9px] text-rail-500 tracking-wide hidden lg:inline" title={t('institution.prototypeLong')}>
          {t('institution.prototype')}
        </span>
        <LanguageSwitch tone="dark" />
      </div>
    </div>
  );
};

/** Application identity — the lower level. Set in the interface's own type. */
export const AppIdentity = ({ sub }) => {
  const { t, isHindi } = useI18n();
  return (
    <div className="min-w-0">
      <div className={`text-white truncate font-semibold uppercase ${isHindi ? 'text-[12px] tracking-[0.06em]' : 'text-[11px] tracking-[0.14em]'}`}>
        {t('institution.appName')}
      </div>
      <div className={`text-rail-400 mt-0.5 truncate font-medium ${isHindi ? 'text-[10px]' : 'text-[10px] tracking-wide'}`}>
        {sub || t('institution.appSub')}
      </div>
    </div>
  );
};
