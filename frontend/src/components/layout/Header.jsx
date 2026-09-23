import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/** The two experiences are distinct products, so the switch is a segmented
 *  control rather than a dropdown — the active one has to be unmistakable. */
export const RoleSwitch = ({ onNavigate, tone = 'dark' }) => {
  const { currentUser, login } = useAuth();
  const { t } = useI18n();
  const role = currentUser?.role;

  // A sunken track with one raised active segment, matching SegmentedControl.
  // `tone` picks the track for a light page vs the dark Ground header.
  const base = tone === 'ws'
    ? { wrap: 'rounded-md bg-ws-tick shadow-recessed p-1 gap-1', idle: 'text-ws-mid hover:text-ws-ink', active: 'bg-ws-surface text-ws-ink shadow-key' }
    : { wrap: 'border border-white/30', idle: 'text-white/75 hover:text-white hover:bg-rail-800', active: 'bg-white text-rail-950' };

  const seg = (target, label) => {
    const active = role === target;
    return (
      <button
        key={target}
        type="button"
        aria-pressed={active}
        onClick={() => (onNavigate ? onNavigate(null, target) : login(target))}
        className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold uppercase tracking-[0.05em] transition-all duration-150 ease-spring focus:outline-none focus-visible:shadow-focus ${
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
      className={`inline-flex items-stretch shrink-0 ${base.wrap}`}
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
      {seg(ROLES.ADMIN, t('role.adminShort'))}
    </div>
  );
};
