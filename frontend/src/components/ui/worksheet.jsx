import React from 'react';

/**
 * Shared page primitives in the industrial-worksheet idiom (design 2A):
 * numbered section headers running into a rule, condensed caps labels, ruled
 * ledger rows, square corners and no depth.
 */

/**
 * Display-caps helper. Latin labels take uppercase and 0.1em tracking;
 * Devanagari has no case and tracking breaks its conjuncts, so Hindi gets
 * neither (index.css enforces the same globally).
 */
export const wsCase = (isHindi) => (isHindi ? { uc: '', tr: '' } : { uc: 'uppercase', tr: 'tracking-[0.1em]' });

/** Section header: number, label, a hairline rule running to the meta. */
export const RegionHeader = ({ number, title, meta, className = '' }) => (
  <div className={`flex items-center gap-2.5 pb-2.5 flex-wrap ${className}`}>
    <span className="flex items-baseline gap-2.5 min-w-0">
      {number && <span className="font-mono text-[11px] font-bold text-ws-light shrink-0">{number}</span>}
      <span className="t-section-title min-w-0">{title}</span>
    </span>
    <span className="flex-1 min-w-6 h-px bg-ws-rule" aria-hidden="true" />
    {meta && <span className="font-mono text-[10px] uppercase text-ws-light">{meta}</span>}
  </div>
);

/** Label/value ledger row over a hairline. */
export const FieldRow = ({ label, value, tone, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-baseline justify-between gap-4 py-[7px] border-b border-ws-hairline last:border-b-0 text-left ${
        onClick ? 'hover:bg-ws-paper transition-colors' : ''
      }`}
    >
      <span className="t-stamp shrink-0">{label}</span>
      <span className={`font-mono text-[12px] font-medium text-right min-w-0 break-words ${tone || 'text-ws-ink'}`}>{value}</span>
    </Tag>
  );
};

/** Status badge: tinted fill, mono caps legend. */
export const PILL_TONE = {
  critical: 'text-ws-barCriticalLabel bg-ws-barCriticalBg',
  warn: 'text-status-warn bg-status-warn-tint',
  ok: 'text-status-ok bg-status-ok-tint',
  info: 'text-ws-barPlannedLabel bg-ws-barPlannedBg',
  bundle: 'text-ws-barBundledLabel bg-ws-barBundledBg',
  idle: 'text-ws-mid bg-ws-tick',
};

export const Pill = ({ tone = 'idle', size = 'md', children }) => (
  <span
    className={`inline-flex items-center rounded-sm font-mono font-bold uppercase tracking-[0.04em] shrink-0 ${PILL_TONE[tone]} ${
      size === 'sm' ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-[3px] text-[10px]'
    }`}
  >
    {children}
  </span>
);

// A notice is a ruled aside: a 3px semantic rule down its left edge.
const ADVISORY_RULE = {
  info: 'border-l-ws-info',
  idle: 'border-l-ws-idle',
  warn: 'border-l-ws-warn',
  critical: 'border-l-ws-critical',
  ok: 'border-l-ws-ok',
};

export const AdvisoryNote = ({ tone = 'info', title, children, action }) => (
  <div className={`bg-ws-dossier border border-ws-rule border-l-[3px] ${ADVISORY_RULE[tone] || ADVISORY_RULE.info} px-4 py-3`}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        {title && <div className="t-stamp !text-ws-ink">{title}</div>}
        <div className="font-ws text-[13px] text-ws-body leading-[1.45] mt-1">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

/**
 * Segmented control: a 1px ruled box of condensed caps; the selected option
 * is filled ink. An unavailable option stays visible, greyed, never hidden.
 */
export const SegmentedControl = ({ options, value, onChange, size = 'md', className = '' }) => {
  const sizeCls = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]';
  return (
    <div className={`inline-flex border border-ws-rule bg-ws-surface shrink-0 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          title={opt.title}
          className={`${sizeCls} font-display font-bold uppercase tracking-[0.08em] transition-colors ${
            opt.disabled
              ? 'text-ws-disabled cursor-not-allowed'
              : value === opt.id
              ? 'bg-ws-ink text-white'
              : 'text-ws-mid hover:text-ws-ink hover:bg-ws-paper'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/** Metric figure + caption: 22px mono over a 12px caption. */
export const StatFigure = ({ value, label, tone = 'text-ws-ink' }) => (
  <div>
    <div className={`font-mono text-[22px] font-bold leading-none ${tone}`}>{value}</div>
    <div className="font-ws text-[12px] text-ws-mid mt-[3px] leading-[1.35]">{label}</div>
  </div>
);

const FIELD = 'font-ws text-[13px] text-ws-ink bg-ws-surface rounded-sm border border-ws-rule hover:border-ws-mid';

export const WsInput = ({ className = '', ...props }) => (
  <input {...props} className={`${FIELD} px-3 py-1.5 font-mono placeholder:text-ws-disabled ${className}`} />
);

export const WsSelect = ({ className = '', children, ...props }) => (
  <select {...props} className={`${FIELD} px-2.5 py-1 ${className}`}>
    {children}
  </select>
);
