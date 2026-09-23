import React, { useState } from 'react';
import { useAuth, ROLES, DEPARTMENTS } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { usePlan } from '../context/PlanContext';
import { InstitutionalHeader, AppFooter, Vents } from '../components/layout/InstitutionalHeader';
import { Button, Select } from '../components/ui';

/**
 * Role selection for the demonstration. This is not authentication and does not
 * claim to be: no credential is checked, and the form exists so an evaluator can
 * enter any of the three experiences directly.
 *
 * The readout beside it shows the full-run artifact's own values, not
 * decoration: solver status, runtime, validation checks and scheduled count.
 */
export const Login = ({ onLoginSuccess }) => {
  const { login, selectedDept, setSelectedDept } = useAuth();
  const { t, isHindi } = useI18n();
  const { baselineMetrics: m } = usePlan();
  const [role, setRole] = useState(ROLES.AUTHORITY);

  const enter = (selectedRole) => {
    login(selectedRole, '', selectedDept);
    if (onLoginSuccess) onLoginSuccess(selectedRole);
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
    <div className="min-h-screen bg-surface-base flex flex-col">
      <InstitutionalHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-12 md:py-16 outline-none">
        <h1 className={`font-extrabold text-ws-ink leading-[1.05] tracking-[-0.03em] t-emboss max-w-3xl ${isHindi ? 'text-[36px] md:text-[48px]' : 'text-[40px] md:text-[60px]'}`}>
          {t('institution.appName')}
        </h1>
        <p className="text-[17px] text-ws-mid mt-3">{t('institution.appSub')}</p>

        <div className="mt-10 md:mt-12 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">
          {/* Control panel */}
          <form
            className="bg-ws-surface rounded-xl shadow-lift bolted px-6 md:px-9 pt-8 pb-9"
            onSubmit={(e) => { e.preventDefault(); enter(role); }}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <span className="t-stamp">{t('login.selectRole')}</span>
              <Vents />
            </div>
            <fieldset>
              <legend className="sr-only">{t('login.selectRole')}</legend>
              <div className="space-y-3">
                {options.map((o) => {
                  const on = role === o.value;
                  return (
                    <label
                      key={o.value}
                      className={`flex gap-4 items-start px-5 py-4 rounded-md cursor-pointer transition-all duration-150 ease-spring has-[:focus-visible]:shadow-focus ${
                        on ? 'shadow-pressed translate-y-[1px]' : 'shadow-key hover:text-ws-ink'
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
                        className={`led mt-1.5 ${on ? 'bg-accent shadow-led-accent' : 'bg-ws-rule shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]'}`}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-[15px] font-bold text-ws-ink">{o.title}</span>
                        <span className="block text-[13px] text-ws-mid mt-1 leading-snug">{o.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {role === ROLES.GROUND && (
              <div className="mt-5">
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

            <Button type="submit" size="lg" variant="primary" className="w-full mt-7">
              {t('login.enter')}
            </Button>
          </form>

          {/* Readout: the device's screen, bezel included. */}
          <div className="bg-rail-900 rounded-xl p-3 shadow-lift">
            <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#A8B2D1]">
                {t('scope.fullRun')}
              </span>
              <span className={`led ${solverOk ? 'bg-[#22C55E] shadow-led-ok' : 'bg-[#D63031] shadow-led-critical'}`} aria-hidden="true" />
            </div>
            <dl className="crt px-5 py-5 space-y-4">
              {readout.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#A8B2D1]">{k}</dt>
                  <dd className="crt-glow font-mono text-[18px] font-semibold mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="text-[13px] text-ws-mid leading-relaxed mt-10 max-w-2xl">
          <span className="font-semibold text-ws-body">{t('login.notAuthTitle')}.</span> {t('login.notAuthBody')}
        </p>
      </main>
      <AppFooter />
    </div>
  );
};
