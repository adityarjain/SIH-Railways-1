import React, { useState } from 'react';
import { useAuth, ROLES, DEPARTMENTS } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { usePlan } from '../context/PlanContext';
import { InstitutionalHeader, AppFooter } from '../components/layout/InstitutionalHeader';
import { Button, Select } from '../components/ui';
import { RegionHeader, wsCase } from '../components/ui/worksheet';

/**
 * Role selection (Ground also picks its department). Not authentication: no
 * credential is checked. With the Operations API running the choice opens a
 * saved, department-scoped session; without it, nothing is saved and the
 * note below says so.
 *
 * The run-state ledger beside it shows the full-run artifact's own values, not
 * decoration: solver status, runtime, validation checks and scheduled count.
 */
export const Login = ({ onLoginSuccess }) => {
  const { mode, login, selectedDept, setSelectedDept } = useAuth();
  const { t, isHindi } = useI18n();
  const { baselineMetrics: m } = usePlan();
  const [role, setRole] = useState(ROLES.AUTHORITY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { uc, tr } = wsCase(isHindi);

  const enter = async (selectedRole) => {
    setBusy(true);
    setError('');
    try {
      await login(selectedRole, '', selectedDept);
      if (onLoginSuccess) onLoginSuccess(selectedRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { value: ROLES.AUTHORITY, title: t('role.authority'), desc: t('role.authorityDesc') },
    { value: ROLES.GROUND, title: t('role.ground'), desc: t('role.groundDesc') },
    { value: ROLES.ADMIN, title: t('role.admin'), desc: t('role.adminDesc') },
  ];

  const prov = m?.provenance || {};
  const horizon = (prov.planning_horizon || '').replace(/\s*\.\.\s*/, ' → ');
  const checks = (prov.post_solve_validation || '').match(/(\d+\/\d+)/)?.[1];
  const solver = m?.summary?.solver_status;
  const solverOk = solver === 'FEASIBLE' || solver === 'OPTIMAL';
  const readout = [
    [t('header.solver'), solver ? `${solver} · ${m.summary.runtime_seconds}s` : null],
    [t('overview.checksLabel'), checks],
    [t('status.scheduled'), m?.summary ? `${m.summary.total_scheduled.toLocaleString()} / ${m.summary.total_tasks_considered.toLocaleString()}` : null],
    [t('header.planHorizon'), horizon || null],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-ws-paper flex flex-col">
      <InstitutionalHeader />

      {/* Masthead on the paper ground, as on every worksheet screen. */}
      <header className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-8 md:pt-12 pb-6">
        <h1 className={`font-display font-semibold text-ws-ink leading-[1.1] max-w-3xl ${isHindi ? 'text-[34px] md:text-[44px]' : 'text-[36px] md:text-[52px]'}`}>
          {t('institution.appName')}
        </h1>
        <p className="text-[15px] text-ws-mid mt-2">{t('institution.appSub')}</p>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 w-full outline-none">
        <div className="grid grid-cols-1 lg:grid-cols-[64fr_36fr] gap-px bg-ws-rule border-b border-ws-rule">
          {/* 01 Role selection: the decision surface, under a 3px ink rule. */}
          {mode !== 'checking' ? (
          <form
            className="bg-ws-dossier border-t-[3px] border-ws-ink px-3.5 md:px-4 xl:px-5 pt-4 pb-6 min-w-0"
            onSubmit={(e) => { e.preventDefault(); enter(role); }}
          >
            <RegionHeader number="01" title={t('login.selectRole')} />
            <fieldset>
              <legend className="sr-only">{t('login.selectRole')}</legend>
              <div className="border-t border-ws-rule">
                {options.map((o) => {
                  const on = role === o.value;
                  return (
                    <label
                      key={o.value}
                      className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2.5 px-1 py-3 border-b border-ws-hairline border-l-[3px] cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ws-ink ${
                        on ? 'bg-ws-selected border-l-ws-ink' : 'border-l-transparent hover:bg-ws-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={o.value}
                        checked={on}
                        onChange={() => setRole(o.value)}
                        className="sr-only"
                      />
                      <span
                        className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${on ? 'border-ws-ink bg-ws-ink shadow-[inset_0_0_0_2px_#FFFFFF]' : 'border-ws-rule bg-ws-surface'}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className={`block font-display text-[16px] font-semibold ${uc} ${tr} text-ws-ink`}>{o.title}</span>
                        <span className="block text-[13px] text-ws-mid mt-0.5 leading-[1.45]">{o.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {role === ROLES.GROUND && (
              <div className="mt-4 max-w-sm">
                <Select
                  label={t('login.department')}
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-[13px] text-ws-critical">{error}</p>}
            <Button type="submit" size="lg" variant="primary" disabled={busy} className="mt-5 min-w-[220px]">
              {t('login.enter')}
            </Button>
          </form>
          ) : (
            <div className="bg-ws-dossier border-t-[3px] border-ws-ink px-3.5 md:px-4 xl:px-5 pt-4 pb-6 text-[13px] text-ws-mid">
              {t('login.checking')}
            </div>
          )}

          {/* 02 Run state: the full-run artifact's own values, as a ledger. */}
          <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-4 pb-6 min-w-0">
            <RegionHeader number="02" title={t('overview.runState')} meta={t('scope.fullRun')} />
            <dl className="border-t border-ws-rule">
              {readout.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-ws-hairline">
                  <dt className="t-stamp">{k}</dt>
                  <dd className={`font-mono text-[13px] font-bold text-right ${k === t('header.solver') ? (solverOk ? 'text-ws-ok' : 'text-ws-critical') : 'text-ws-ink'}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="text-[13px] text-ws-mid leading-relaxed px-3.5 md:px-4 xl:px-5 mt-5 max-w-3xl">
          {mode === 'api' ? (
            <><span className="font-semibold text-ws-body">{t('login.apiTitle')}.</span> {t('login.apiNote')}</>
          ) : (
            <><span className="font-semibold text-ws-body">{t('login.localTitle')}.</span> {t('login.localNote')}</>
          )}
        </p>
      </main>
      <AppFooter />
    </div>
  );
};
