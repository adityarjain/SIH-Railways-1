import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
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
  const { t, isHindi } = useI18n();

  const prov = metrics.provenance || {};

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
      {/* Provenance strip: identity on the left, how these numbers were
           produced on the right. Run state lives here rather than in the
           masthead because it describes the run, not the page. Light rather
           than a solid dark block: at full width it was the single heaviest
           element on every screen. */}
      <div className="bg-ws-surface border-b border-ws-rule min-h-[34px] px-3.5 md:px-4 xl:px-5 py-1.5 flex items-center gap-3 flex-wrap font-display">
        <span className="text-[13px] font-bold tracking-[-0.01em] text-ws-ink">
          {t('institution.appName')}
        </span>
        <span className="font-ws text-[11px] text-ws-light hidden xl:inline">{t('institution.appSub')}</span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-mid">
          <span className="text-ws-ok font-semibold">{metrics.summary.solver_status}</span> {metrics.summary.runtime_seconds}s
          {checksMatch && (<> · {t('overview.checksLabel')} <span className="text-ws-ink font-semibold">{checksMatch[1]}</span></>)}
          {' · '}<span className="text-ws-mid">{t('header.syntheticData')}</span>
        </span>
        <span className="font-mono text-[9px] text-ws-light hidden xl:inline">
          {t('institution.prototype')}
        </span>
        <LanguageSwitch tone="light" />
      </div>

      {/* Masthead */}
      <div className="bg-ws-paper px-3.5 md:px-4 xl:px-5 pt-5 pb-4 flex items-end gap-6 flex-wrap">
        <div className="min-w-0">
          <h1 className={`font-display font-semibold text-ws-ink leading-[1.1] tracking-[-0.025em] ${isHindi ? 'text-[26px]' : 'text-[32px]'}`}>
            {t(activeItem?.labelKey || 'nav.overview')}
          </h1>
          <div className="font-ws text-[13px] text-ws-mid mt-1.5">
            {subtitle || defaultSubtitle}
          </div>
        </div>
        <span className="flex-1 min-w-3" />
        <RoleSwitch onNavigate={onNavigate} tone="ws" />
      </div>

      {/* Navigation. Sentence case: the uppercase + tracking treatment cost
           horizontal room on every screen and made the strip shout. */}
      <div className="bg-ws-paper px-3.5 md:px-4 xl:px-5 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 whitespace-nowrap border-b border-ws-rule">
          {navItems.map((item) => {
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`shrink-0 px-3 py-2.5 font-display text-[13px] font-semibold border-b-2 -mb-px rounded-t transition-colors ${
                  active
                    ? 'border-ws-info text-ws-ink'
                    : 'border-transparent text-ws-mid hover:text-ws-ink hover:bg-ws-tick'
                }`}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
