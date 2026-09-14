import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useDemoGuide } from '../../context/DemoGuideContext';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { RoleSwitch } from './Header';
import { NAV_ITEMS_BY_ROLE } from './Sidebar';

/**
 * Shared Authority chrome (design 2A, "industrial worksheet") — provenance
 * strip, masthead and horizontal navigation. Extracted from the Overview
 * worksheet so every Authority screen shares the exact same header rather
 * than each page owning its own copy. `subtitle` lets a page override the
 * masthead's second line (Overview passes its day-sheet-specific summary);
 * every other page gets the plan-horizon default below.
 */
export const WorksheetHeader = ({ activeTab, onNavigate, subtitle }) => {
  const { baselineMetrics: metrics } = usePlan();
  const { currentUser } = useAuth();
  const { isGuideActive, toggleGuide, currentStepIndex, totalSteps } = useDemoGuide();
  const { t, isHindi } = useI18n();

  const prov = metrics.provenance || {};
  const uc = isHindi ? '' : 'uppercase';
  const tr = isHindi ? '' : 'tracking-[0.1em]';

  const checksMatch = (prov.post_solve_validation || '').match(/(\d+\/\d+)/);
  const planHorizonMatch = (prov.planning_horizon || '').match(
    /(\d{4})-(\d{2})-(\d{2})\s*\.\.\s*(\d{4})-(\d{2})-(\d{2})/,
  );

  const navItems = NAV_ITEMS_BY_ROLE[currentUser?.role] || [];
  const activeItem = navItems.find((item) => item.id === activeTab);

  const defaultSubtitle = (
    <>
      {t('header.planHorizon')}{' '}
      <span className="font-mono text-xs text-ws-body">
        {planHorizonMatch
          ? `${planHorizonMatch[1]}-${planHorizonMatch[2]}-${planHorizonMatch[3]} → ${planHorizonMatch[4]}-${planHorizonMatch[5]}-${planHorizonMatch[6]}`
          : prov.planning_horizon}
      </span>
      {' · '}
      <span className="font-mono text-xs text-ws-body">{metrics.summary.total_scheduled.toLocaleString()}</span>{' '}
      {t('status.scheduled').toLowerCase()},{' '}
      <span className="font-mono text-xs text-ws-body">
        {(metrics.risk_breakdown?.critical_risk_deferred ?? 0).toLocaleString()}
      </span>{' '}
      {t('overview.criticalDeferred').toLowerCase()} {t('scope.fullRun').toLowerCase()}
    </>
  );

  return (
    <>
      {/* 01 — provenance strip */}
      <div className="bg-ws-ink min-h-[26px] px-3.5 md:px-4 xl:px-5 py-[3px] flex items-center gap-2.5 flex-wrap font-display">
        <span className={`text-[13px] font-bold ${uc} tracking-[0.18em] text-white`}>
          {t('institution.appName')}
        </span>
        <span className="w-px h-[11px] bg-[#4A4338]" />
        <span className="font-ws text-[11px] text-[#A79F90]">{t('institution.appSub')}</span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[9px] tracking-wide text-[#A79F90]">
          {t('institution.prototype').toUpperCase()}
        </span>
        <LanguageSwitch tone="ws" />
      </div>

      {/* 02 — masthead */}
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-3.5 pb-2.5 flex items-end gap-6 flex-wrap">
        <div className="min-w-0">
          <div className={`font-display text-[30px] font-semibold text-ws-ink leading-[1.05] tracking-[-0.005em] ${isHindi ? 'text-[26px]' : ''}`}>
            {t(activeItem?.labelKey || 'nav.overview')}
          </div>
          <div className="font-ws text-[13px] text-ws-mid mt-1">
            {subtitle || defaultSubtitle}
          </div>
        </div>
        <span className="flex-1 min-w-3" />
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right hidden sm:block">
            <div className={`font-display text-xs font-semibold ${uc} ${tr} text-ws-light`}>{t('overview.runState')}</div>
            <div className="font-mono text-[11px] text-ws-body mt-0.5">
              <span className="text-ws-warn font-bold">{metrics.summary.solver_status}</span> {metrics.summary.runtime_seconds}s
              {checksMatch && (<> · {t('overview.checksLabel')} <span className="text-ws-ok font-bold">{checksMatch[1]}</span></>)}
              {' · '}<span className="text-ws-warn">{t('header.syntheticData')}</span>
            </div>
          </div>
          <RoleSwitch onNavigate={onNavigate} tone="ws" />
        </div>
      </div>

      {/* 03 — navigation */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-5 whitespace-nowrap">
          {navItems.map((item) => {
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`shrink-0 py-[9px] font-display text-sm font-semibold ${uc} ${tr} border-b-2 transition-colors ${
                  active
                    ? 'border-ws-ink text-ws-ink'
                    : 'border-transparent text-ws-mid hover:text-ws-ink hover:border-ws-rule'
                }`}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
          <button
            onClick={toggleGuide}
            className={`shrink-0 py-[9px] font-display text-sm font-semibold ${uc} ${tr} border-b-2 border-transparent text-ws-mid hover:text-ws-ink hover:border-ws-rule transition-colors`}
          >
            {t('header.guidedDemo')}{isGuideActive ? ` · ${currentStepIndex + 1}/${totalSteps}` : ''}
          </button>
        </div>
      </div>
    </>
  );
};
