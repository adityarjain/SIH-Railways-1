import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/** The three experiences are distinct products, so the switch is a
 *  segmented control rather than a dropdown: a 1px ink box with the active
 *  role filled in ink. `tone` is accepted for old call sites and ignored. */
// eslint-disable-next-line no-unused-vars
export const RoleSwitch = ({ onNavigate, tone }) => {
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
        className={`px-3 py-1 font-display text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${
          active ? 'bg-ws-ink text-white' : 'text-ws-ink hover:bg-ws-paper'
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
      className="inline-flex items-stretch shrink-0 border border-ws-ink bg-ws-surface"
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
      {seg(ROLES.ADMIN, t('role.adminShort'))}
    </div>
  );
};
