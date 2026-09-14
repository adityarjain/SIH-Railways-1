import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/** The two experiences are distinct products, so the switch is a segmented
 *  control rather than a dropdown — the active one has to be unmistakable. */
export const RoleSwitch = ({ onNavigate, tone = 'dark' }) => {
  const { currentUser, login } = useAuth();
  const { t } = useI18n();
  const role = currentUser?.role;

  // "Industrial worksheet" (design 2A) masthead — Authority Overview only.
  const base = tone === 'ws'
    ? { wrap: 'border-ws-ink', idle: 'bg-transparent text-ws-mid hover:text-ws-ink', active: 'bg-ws-ink text-white' }
    : { wrap: 'border-rail-700 bg-rail-950', idle: 'bg-rail-800 text-rail-400 hover:text-white', active: 'bg-status-info text-white' };

  const seg = (target, label) => {
    const active = role === target;
    return (
      <button
        key={target}
        type="button"
        aria-pressed={active}
        onClick={() => (onNavigate ? onNavigate(null, target) : login(target))}
        className={`px-3.5 py-1.5 text-[10px] font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-status-info ${
          active ? base.active : base.idle
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
      className={`flex items-stretch border shrink-0 ${base.wrap}`}
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
      {seg(ROLES.ADMIN, t('role.adminShort'))}
    </div>
  );
};
