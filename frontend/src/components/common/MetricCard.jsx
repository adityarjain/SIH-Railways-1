import React from 'react';
import { ScopeCaption } from '../ui';

/**
 * Compact figure tile. The previous version carried a 7-scheme colour map and
 * rendered as a large decorative KPI card; this one is a dense operational
 * readout that can carry the artifact scope its number came from.
 */
const TONE = {
  red: 'text-status-critical',
  amber: 'text-status-warn',
  orange: 'text-status-warn',
  green: 'text-status-ok',
  blue: 'text-status-info',
  purple: 'text-bundle',
  slate: 'text-rail-900',
};

export const MetricCard = ({ title, value, subtext, icon: Icon, color = 'slate', scope, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-surface-panel border border-line rounded-lg px-3 py-2.5 text-left w-full ${
        onClick ? 'hover:border-line-strong hover:bg-surface-sunken transition-colors' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-rail-400 shrink-0" />}
        <span className="t-label truncate">{title}</span>
      </div>
      <div className={`font-mono text-xl font-semibold mt-1 ${TONE[color] || TONE.slate}`}>{value}</div>
      {subtext && <div className="text-[10px] text-rail-400 mt-0.5 leading-snug">{subtext}</div>}
      {scope && <ScopeCaption className="block mt-1">{scope}</ScopeCaption>}
    </Tag>
  );
};
