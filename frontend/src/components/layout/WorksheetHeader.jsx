import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { NAV_ITEMS_BY_ROLE } from './Sidebar';

/**
 * Page header for Authority and Admin screens: title plus a one-line summary.
 * Navigation and identity live in the app shell. `subtitle` lets a page override the
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

  return (
    <div id="main-content" tabIndex={-1} className="px-4 md:px-6 pt-7 pb-5 outline-none">
      <h1 className={`font-display font-extrabold text-ws-ink leading-tight tracking-[-0.03em] t-emboss ${isHindi ? 'text-[28px]' : 'text-[32px] md:text-[36px]'}`}>
        {t(activeItem?.labelKey || 'nav.overview')}
      </h1>
      <p className="text-[14px] text-ws-mid mt-1.5">{subtitle || defaultSubtitle}</p>
    </div>
  );
};
