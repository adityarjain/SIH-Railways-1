import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { NAV_ITEMS_BY_ROLE, NAV_SECTIONS_BY_ROLE } from './Sidebar';

/**
 * Page header for Authority and Admin screens: section label, serif title,
 * a short gold rule, and a one-line summary. Navigation lives in the shell. `subtitle` lets a page override the
 * masthead's second line (Overview passes its day-sheet-specific summary);
 * every other page gets the plan-horizon default below.
 */
export const WorksheetHeader = ({ activeTab, subtitle }) => {
  const { baselineMetrics: metrics } = usePlan();
  const { currentUser } = useAuth();
  const { t, isHindi } = useI18n();

  const prov = metrics.provenance || {};

  const planHorizonMatch = (prov.planning_horizon || '').match(
    /(\d{4})-(\d{2})-(\d{2})\s*\.\.\s*(\d{4})-(\d{2})-(\d{2})/,
  );

  const navItems = NAV_ITEMS_BY_ROLE[currentUser?.role] || [];
  const activeItem = navItems.find((item) => item.id === activeTab);

  const defaultSubtitle = (
    <>
      {t('header.planHorizon')}{' '}
      <span className="font-medium text-ws-body tabular-nums">
        {planHorizonMatch
          ? `${planHorizonMatch[1]}-${planHorizonMatch[2]}-${planHorizonMatch[3]} → ${planHorizonMatch[4]}-${planHorizonMatch[5]}-${planHorizonMatch[6]}`
          : prov.planning_horizon}
      </span>
      {' · '}
      <span className="font-medium text-ws-body tabular-nums">{metrics.summary.total_scheduled.toLocaleString()}</span>{' '}
      {t('status.scheduled').toLowerCase()},{' '}
      <span className="font-medium text-ws-body tabular-nums">
        {(metrics.risk_breakdown?.critical_risk_deferred ?? 0).toLocaleString()}
      </span>{' '}
      {t('overview.criticalDeferred').toLowerCase()} {t('scope.fullRun').toLowerCase()}
    </>
  );

  const group = (NAV_SECTIONS_BY_ROLE[currentUser?.role] || []).find((g) => g.items.some((i) => i.id === activeTab));

  return (
    <div id="main-content" tabIndex={-1} className="px-5 md:px-8 pt-12 md:pt-16 pb-10 outline-none">
      {group && <div className="t-stamp !text-accent">{t(group.groupKey)}</div>}
      <h1 className={`font-serif text-ws-ink leading-[1.1] tracking-[-0.02em] mt-4 ${isHindi ? 'text-[34px] md:text-[44px]' : 'text-[38px] md:text-[52px]'}`}>
        {t(activeItem?.labelKey || 'nav.overview')}
      </h1>
      <div className="h-px w-12 bg-accent-bright mt-6" aria-hidden="true" />
      <p className="text-[15px] text-ws-mid leading-[1.75] mt-5 max-w-3xl">{subtitle || defaultSubtitle}</p>
    </div>
  );
};
