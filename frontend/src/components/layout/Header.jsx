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
    ? { wrap: 'bg-ws-tick', idle: 'text-ws-mid hover:text-ws-ink', active: 'bg-ws-surface text-ws-ink shadow-soft' }
    : { wrap: 'bg-rail-800', idle: 'text-rail-300 hover:text-white', active: 'bg-status-info text-white' };

  const seg = (target, label) => {
    const active = role === target;
    return (
      <button
        key={target}
        type="button"
        aria-pressed={active}
        onClick={() => (onNavigate ? onNavigate(null, target) : login(target))}
        className={`px-3.5 py-1.5 rounded text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40 ${
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
      className={`inline-flex items-stretch gap-0.5 rounded-md p-0.5 shrink-0 ${base.wrap}`}
    >
      {seg(ROLES.AUTHORITY, t('role.authorityShort'))}
      {seg(ROLES.GROUND, t('role.groundShort'))}
      {seg(ROLES.ADMIN, t('role.adminShort'))}
    </div>
  );
};
