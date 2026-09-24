import React, { createContext, useContext, useEffect } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { NAV_ITEMS_BY_ROLE } from './Sidebar';
import { RoleSwitch } from './Header';
import { AlertsMenu } from './AlertsMenu';

/**
 * Lets a page replace the masthead's scope line (Overview passes its
 * day-sheet line). The shell owns the state; pages call useMastheadSubtitle.
 */
export const MastheadContext = createContext(() => {});

export const useMastheadSubtitle = (node, deps) => {
  const setSubtitle = useContext(MastheadContext);
  useEffect(() => {
    setSubtitle(node);
    return () => setSubtitle(null);
    // `node` is JSX rebuilt every render; the caller lists what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

const Mono = ({ children }) => <span className="font-mono text-xs text-ws-body">{children}</span>;

/**
 * Masthead for every role, on the paper ground: screen title and one line of
 * scope on the left; run state and the role switch on the right.
 */
export const WorksheetHeader = ({ activeTab, subtitle, onNavigate }) => {
  const { baselineMetrics: metrics } = usePlan();
  const { currentUser, mode } = useAuth();
  const { t, isHindi } = useI18n();

  const prov = metrics.provenance || {};
  const summary = metrics.summary || {};
  const solver = summary.solver_status;
  const solverOk = solver === 'FEASIBLE' || solver === 'OPTIMAL';
  const checks = (prov.post_solve_validation || '').match(/(\d+\/\d+)/)?.[1];
  const horizon = (prov.planning_horizon || '').match(
    /(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})/,
  );

  const role = currentUser?.role;
  const activeItem = (NAV_ITEMS_BY_ROLE[role] || []).find((item) => item.id === activeTab);

  const defaultSubtitle = role === ROLES.GROUND ? (
    <>{currentUser?.department} · {currentUser?.name}</>
  ) : (
    <>
      {t('header.planHorizon')}{' '}
      <Mono>{horizon ? `${horizon[1]} → ${horizon[2]}` : prov.planning_horizon}</Mono>
      {' · '}<Mono>{(summary.total_scheduled ?? 0).toLocaleString()}</Mono>{' '}
      {t('status.scheduled').toLowerCase()},{' '}
      <Mono>{(metrics.risk_breakdown?.critical_risk_deferred ?? 0).toLocaleString()}</Mono>{' '}
      {t('overview.criticalDeferred').toLowerCase()} {t('scope.fullRun').toLowerCase()}
    </>
  );

  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[13px] pb-[11px] flex flex-wrap items-end gap-x-6 gap-y-3 outline-none"
    >
      <div className="min-w-0 flex-1 basis-[420px]">
        <h1 className={`font-display font-semibold text-ws-ink leading-tight ${isHindi ? 'text-[26px] md:text-[28px]' : 'text-[26px] md:text-[30px]'}`}>
          {t(activeItem?.labelKey || 'nav.overview')}
        </h1>
        <p className="text-[13px] text-ws-mid mt-0.5">{subtitle || defaultSubtitle}</p>
      </div>
      <div className="flex items-end gap-4 flex-wrap print:hidden">
        {solver && (
          <div className="text-right">
            <div className="t-stamp !text-[11px]">{t('overview.runState')}</div>
            <div className="font-mono text-[11px] text-ws-mid mt-0.5">
              <span className={`font-bold ${solverOk ? 'text-ws-ok' : 'text-ws-critical'}`}>{solver}</span>{' '}
              {summary.runtime_seconds}s
              {checks && <> · {t('overview.checksLabel')} {checks}</>}
              {' · '}<span className="font-bold text-ws-warn">SYNTHETIC</span>
            </div>
          </div>
        )}
        {role !== ROLES.ADMIN && <AlertsMenu onNavigate={onNavigate} />}
        <div className="flex flex-col items-end gap-1">
          <RoleSwitch onNavigate={onNavigate} />
          <span className={`font-mono text-[10px] uppercase ${mode === 'api' ? 'text-ws-ok' : 'text-ws-warn'}`}>
            {t(mode === 'api' ? 'login.apiBadge' : 'login.localBadge')}
          </span>
        </div>
      </div>
    </div>
  );
};
