import React from 'react';
import { StatusBadge } from '../ui';

/**
 * The previous Badge carried 18 ad-hoc variants. They now collapse onto the
 * five semantic tones (plus bundling, which is genuinely its own meaning), so
 * the same state reads identically on every screen. The `variant` prop keeps
 * its original vocabulary so existing call sites don't have to change.
 */
const VARIANT_TONE = {
  // risk bands
  CRITICAL: 'critical',
  HIGH: 'warn',
  MODERATE: 'info',
  LOW: 'ok',

  // generic
  danger: 'critical',
  warning: 'warn',
  success: 'ok',
  info: 'info',
  neutral: 'idle',
  default: 'idle',
  bundle: 'bundle',

  // operational statuses
  Scheduled: 'info',
  Pending: 'warn',
  'Pending Optimization': 'warn',
  Completed: 'ok',
  Accepted: 'ok',
  'In Progress': 'info',
  Replanned: 'warn',
  Deferred: 'idle',
  Verified: 'ok',
  Rejected: 'critical',
  'Rejected by Field Crew': 'critical',
};

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  let t = VARIANT_TONE[variant];
  if (!t && typeof variant === 'string') {
    if (variant.startsWith('Reschedule')) t = 'warn';
    else if (variant.startsWith('Rejected')) t = 'critical';
  }
  return (
    <StatusBadge tone={t || 'idle'} size={size} className={className}>
      {children}
    </StatusBadge>
  );
};
