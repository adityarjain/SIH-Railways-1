import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useDemoGuide } from '../../context/DemoGuideContext';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { AppIdentity } from './InstitutionalHeader';

export { AppIdentity as Wordmark } from './InstitutionalHeader';

/** The two experiences are distinct products, so the switch is a segmented
 *  control rather than a dropdown — the active one has to be unmistakable. */
export const RoleSwitch = ({ onNavigate }) => {
  const { currentUser, login } = useAuth();
  const { t } = useI18n();
  const role = currentUser?.role;

  const seg = (target, label) => {
    const active = role === target;
    return (
      <button
        key={target}
        type="button"
        aria-pressed={active}
        onClick={() => (onNavigate ? onNavigate(null, target) : login(target))}
        className={`px-3.5 py-1.5 text-[10px] font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-status-info ${
          active ? 'bg-status-info text-white' : 'bg-rail-800 text-rail-400 hover:text-white'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t('role.switchLabel')}
      className="flex items-stretch border border-rail-700 bg-rail-950 shrink-0"
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
    </div>
  );
};

const Fact = ({ label, value, tone = 'text-white' }) => (
  <div className="min-w-0">
    <div className="text-[8px] font-semibold uppercase tracking-[0.1em] text-rail-500">{label}</div>
    <div className={`font-mono text-[10px] mt-0.5 truncate ${tone}`}>{value}</div>
  </div>
);

/**
 * Authority application bar — the lower level of the two-level header.
 * Every value is read from the run artifact.
 */
export const Header = ({ onNavigate }) => {
  const { isGuideActive, toggleGuide, currentStepIndex, totalSteps } = useDemoGuide();
  const { activeEvent, isReplanned, baselineMetrics } = usePlan();
  const { t } = useI18n();
  const prov = baselineMetrics?.provenance || {};
  const sum = baselineMetrics?.summary || {};

  return (
    <header className="bg-rail-900 border-b border-rail-800 px-5 py-2.5 flex items-center gap-6 sticky top-0 z-header">
      <AppIdentity />
      <RoleSwitch onNavigate={onNavigate} />

      <div className="flex items-center gap-6 flex-1 min-w-0">
        <Fact label={t('header.planHorizon')} value={prov.planning_horizon || '—'} />
        <Fact label={t('header.solver')} value={`${sum.solver_status || '—'} · ${sum.runtime_seconds ?? '—'}s`} />
        <Fact
          label={t('header.validation')}
          value={prov.post_solve_validation || t('header.notRecorded')}
          tone="text-status-ok"
        />
        <Fact label={t('header.data')} value={t('header.syntheticData')} tone="text-status-warn" />

        {activeEvent && (
          <div className="flex items-center gap-1.5 border border-status-warn bg-status-warn/15 px-2 py-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warn" />
            <span className="text-[10px] font-semibold text-status-warn truncate max-w-[200px]">
              {activeEvent.name}
            </span>
          </div>
        )}
        {isReplanned && (
          <div className="border border-status-info bg-status-info/15 px-2 py-1 shrink-0">
            <span className="text-[10px] font-semibold text-status-info">{t('header.replanned')}</span>
          </div>
        )}
      </div>

      <button
        onClick={toggleGuide}
        className={`px-3 py-1.5 text-[10px] font-semibold tracking-wide border transition-colors shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-status-info ${
          isGuideActive
            ? 'bg-status-info text-white border-status-info'
            : 'bg-rail-800 text-rail-300 border-rail-700 hover:text-white'
        }`}
      >
        {t('header.guidedDemo')}{isGuideActive ? ` · ${currentStepIndex + 1}/${totalSteps}` : ''}
      </button>
    </header>
  );
};
