import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/** The three roles as small-caps links; the active one carries a gold rule,
 *  so which product you are in is always unmistakable. */
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
        className={`py-1 border-b-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ease-out focus:outline-none focus-visible:shadow-focus ${active ? 'border-accent-bright text-ws-ink' : 'border-transparent text-ws-mid hover:text-ws-ink'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t('role.switchLabel')}
      className="inline-flex items-center gap-4 shrink-0"
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
      {seg(ROLES.ADMIN, t('role.adminShort'))}
    </div>
  );
};
