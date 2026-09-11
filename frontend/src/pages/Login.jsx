import React, { useState } from 'react';
import { useAuth, ROLES, DEPARTMENTS } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { LanguageSwitch } from '../components/layout/LanguageSwitch';
import { Button, Select, Alert } from '../components/ui';

const NamePair = ({ hi, en }) => (
  <div className="leading-tight">
    <div lang="hi" className="text-[12px] font-medium text-white">{hi}</div>
    <div className="text-[10px] text-rail-400 tracking-wide">{en}</div>
  </div>
);

/**
 * Role selection for the demonstration. This is not authentication and does not
 * claim to be: no credential is checked, and the form exists so an evaluator can
 * enter either experience directly.
 */
export const Login = ({ onLoginSuccess }) => {
  const { login, selectedDept, setSelectedDept } = useAuth();
  const { t, isHindi } = useI18n();
  const [role, setRole] = useState(ROLES.AUTHORITY);

  const enter = (selectedRole) => {
    login(selectedRole, '', selectedDept);
    if (onLoginSuccess) onLoginSuccess(selectedRole);
  };

  const RoleCard = ({ value, title, desc }) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={`w-full text-left px-4 py-3 border rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-status-info ${
        role === value ? 'border-status-info bg-status-info-tint' : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="text-[13px] font-semibold text-rail-900">{title}</div>
      <div className="text-[11px] text-rail-500 mt-0.5 leading-relaxed">{desc}</div>
    </button>
  );

  return (
    <div className="min-h-screen bg-rail-950 flex flex-col">
      {/* Institutional band — text identity only; see InstitutionalHeader for
          why no emblem or logo asset is shipped. */}
      <div className="border-b border-rail-800 px-5 py-2.5 flex items-center gap-5 flex-wrap">
        <NamePair hi={t('institution.govHi')} en={t('institution.gov')} />
        <span className="h-7 w-px bg-rail-800 shrink-0" aria-hidden="true" />
        <NamePair hi={t('institution.ministryHi')} en={t('institution.ministry')} />
        <span className="h-7 w-px bg-rail-800 shrink-0 hidden sm:block" aria-hidden="true" />
        <div className="hidden sm:block">
          <NamePair hi={t('institution.railwaysHi')} en={t('institution.railways')} />
        </div>
        <div className="flex-1" />
        <LanguageSwitch tone="dark" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-5">
          <div className="border-l-2 border-status-info pl-4">
            <h1 className={`text-white font-semibold uppercase ${isHindi ? 'text-[15px] tracking-[0.04em]' : 'text-[15px] tracking-[0.14em]'}`}>
              {t('institution.appName')}
            </h1>
            <p className="text-xs text-rail-400 font-medium tracking-wide mt-1">
              {t('institution.appSub')}
            </p>
            <span className="inline-block bg-rail-800 text-rail-300 text-[10px] px-2 py-0.5 font-mono border border-rail-700 mt-2.5">
              {t('institution.prototype')}
            </span>
          </div>

          <div className="bg-surface-panel rounded-lg border border-line overflow-hidden">
            <div className="px-4 py-3 bg-surface-sunken border-b border-line">
              <div className="t-label">{t('login.selectRole')}</div>
            </div>

            <div className="p-4 space-y-3">
              <RoleCard value={ROLES.AUTHORITY} title={t('role.authority')} desc={t('role.authorityDesc')} />
              <RoleCard value={ROLES.GROUND} title={t('role.ground')} desc={t('role.groundDesc')} />

              {role === ROLES.GROUND && (
                <div className="pt-1">
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

              <Button size="lg" variant="primary" className="w-full" onClick={() => enter(role)}>
                {t('login.enter')}
              </Button>
            </div>
          </div>

          <Alert tone="idle" title={t('login.notAuthTitle')}>
            {t('login.notAuthBody')}
          </Alert>

          <p className="text-center text-[10px] text-rail-500 leading-relaxed">
            {t('institution.prototypeLong')}
          </p>

          <div className="text-center text-[10px] text-rail-500 font-mono">
            {t('login.stack')}
          </div>
        </div>
      </div>
    </div>
  );
};
