import React, { useState } from 'react';
import { useAuth, ROLES, DEPARTMENTS } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { usePlan } from '../context/PlanContext';
import { InstitutionalHeader, AppFooter } from '../components/layout/InstitutionalHeader';
import { Button, Select } from '../components/ui';

/**
 * Role selection for the demonstration. This is not authentication and does not
 * claim to be: no credential is checked, and the form exists so an evaluator can
 * enter any of the three experiences directly.
 *
 * The figures are the full-run artifact's own values, not decoration.
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

  const s = m?.summary;
  const checks = (m?.provenance?.post_solve_validation || '').match(/(\d+\/\d+)/)?.[1];
  const figures = [
    s && [s.total_scheduled.toLocaleString(), `${t('status.scheduled')} / ${s.total_tasks_considered.toLocaleString()}`],
    checks && [checks, t('overview.checksLabel')],
    s && [`${s.runtime_seconds}s`, `${t('header.solver')} · ${s.solver_status}`],
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <InstitutionalHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-8 outline-none">
        {/* Masthead */}
        <header className="pt-20 md:pt-32 pb-16 md:pb-20 text-center">
          <div className="t-section-label max-w-md mx-auto">{t('institution.appSub')}</div>
          <h1 className={`font-serif text-ws-ink leading-[1.1] tracking-[-0.02em] mt-8 ${isHindi ? 'text-[38px] md:text-[56px]' : 'text-[40px] md:text-[72px]'}`}>
            {t('institution.appName')}
          </h1>
        </header>

        {/* Figures from the last full run */}
        {figures.length > 0 && (
          <section aria-label={t('scope.fullRun')} className="border-y border-ws-rule py-10">
            <div className="t-scope text-center mb-8">{t('scope.fullRun')}</div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-8 sm:divide-x divide-ws-rule">
              {figures.map(([value, label]) => (
                <div key={label} className="text-center px-4">
                  <dd className="font-serif text-[40px] md:text-[48px] leading-none text-ws-ink">{value}</dd>
                  <dt className="t-scope mt-3">{label}</dt>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Role selection */}
        <section className="py-20 md:py-28 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="font-serif text-[30px] md:text-[36px] leading-[1.2] tracking-[-0.01em] text-ws-ink">
              {t('login.selectRole')}
            </h2>
            <p className="text-[15px] text-ws-mid leading-[1.75] mt-5 max-w-sm">
              {t('login.notAuthBody')}
            </p>
          </div>

          <form
            className="bg-ws-surface rounded-lg shadow-panel border-t-2 border-t-accent-bright px-6 md:px-9 pt-4 pb-9"
            onSubmit={(e) => { e.preventDefault(); enter(role); }}
          >
            <fieldset>
              <legend className="sr-only">{t('login.selectRole')}</legend>
              <div className="divide-y divide-ws-rule">
                {options.map((o) => {
                  const on = role === o.value;
                  return (
                    <label key={o.value} className="flex gap-4 items-start py-5 cursor-pointer touch-manipulation group">
                      <input
                        type="radio"
                        name="role"
                        value={o.value}
                        checked={on}
                        onChange={() => setRole(o.value)}
                        className="mt-2 h-4 w-4 accent-[#8F6A08] focus:outline-none focus-visible:shadow-focus"
                      />
                      <span>
                        <span className={`block font-serif text-[20px] leading-[1.3] transition-colors duration-200 ${on ? 'text-ws-ink' : 'text-ws-body group-hover:text-ws-ink'}`}>
                          {o.title}
                        </span>
                        <span className="block text-[14px] text-ws-mid mt-1 leading-[1.6]">{o.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {role === ROLES.GROUND && (
              <div className="mt-2">
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
        </section>
      </main>
      <AppFooter />
    </div>
  );
};
