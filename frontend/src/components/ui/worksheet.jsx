import React from 'react';

/**
 * Shared primitives for the "industrial worksheet" (design 2A) page idiom —
 * extracted after Overview, Replanning and Maintenance Blocks each hand-built
 * the same numbered-region header, field row, pill and segmented-control
 * patterns. Every remaining page reuses these instead of re-deriving them.
 */

/** Hindi drops forced uppercase/tracking on display labels (design 2A rule). */
export const wsCase = (isHindi) => ({
  uc: isHindi ? '' : 'uppercase',
  tr: isHindi ? '' : 'tracking-[0.1em]',
});

/** Numbered worksheet region header: mono number, display title, rule, meta. */
export const RegionHeader = ({ number, title, meta, isHindi, className = '' }) => {
  const { uc, tr } = wsCase(isHindi);
  return (
    <div className={`flex items-center gap-2.5 pb-2 flex-wrap ${className}`}>
      {number && <span className="font-mono text-[11px] font-bold text-ws-light">{number}</span>}
      <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{title}</span>
      <span className="flex-1 min-w-6 h-px bg-ws-rule" />
      {meta && <span className="font-mono text-[10px] text-ws-light">{meta}</span>}
    </div>
  );
};

/** Dense label/value row for field-grid dossiers. */
export const FieldRow = ({ label, value, tone, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-start justify-between gap-3 py-1.5 border-b border-ws-hairline last:border-b-0 text-left ${onClick ? 'hover:bg-ws-paper transition-colors' : ''}`}
    >
      <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light shrink-0">{label}</span>
      <span className={`font-mono text-[12px] font-medium text-right ${tone || 'text-ws-ink'}`}>{value}</span>
    </Tag>
  );
};

export const PILL_TONE = {
  critical: 'text-ws-critical border-ws-critical bg-ws-barCriticalBg',
  warn: 'text-ws-warn border-ws-warn bg-[#F5ECD6]',
  ok: 'text-ws-ok border-ws-ok bg-[#E1EDE6]',
  info: 'text-ws-info border-ws-info bg-ws-barPlannedBg',
  bundle: 'text-ws-bundle border-ws-bundle bg-ws-barBundledBg',
  idle: 'text-ws-idle border-ws-rule bg-ws-tick',
};

export const Pill = ({ tone = 'idle', size = 'md', children }) => (
  <span
    className={`inline-flex items-center font-display font-bold uppercase tracking-wide border shrink-0 ${PILL_TONE[tone]} ${
      size === 'sm' ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
    }`}
  >
    {children}
  </span>
);

const ADVISORY_TONE = {
  info: { bar: 'border-l-ws-info', title: 'text-ws-info' },
  idle: { bar: 'border-l-ws-idle', title: 'text-ws-idle' },
  warn: { bar: 'border-l-ws-warn', title: 'text-ws-warn' },
  critical: { bar: 'border-l-ws-critical', title: 'text-ws-critical' },
  ok: { bar: 'border-l-ws-ok', title: 'text-ws-ok' },
};

export const AdvisoryNote = ({ tone = 'info', title, children, action }) => {
  const c = ADVISORY_TONE[tone] || ADVISORY_TONE.info;
  return (
    <div className={`border-l-[3px] ${c.bar} bg-ws-paper px-3 py-2.5`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          {title && <div className={`font-display text-[11px] font-bold uppercase tracking-wide ${c.title}`}>{title}</div>}
          <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">{children}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
};

/** Segmented button group — the Full day / Night / Possession idiom. */
export const SegmentedControl = ({ options, value, onChange, isHindi, size = 'md', className = '' }) => {
  const { uc, tr } = wsCase(isHindi);
  const sizeCls = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-[13px]';
  return (
    <div className={`flex border border-ws-rule shrink-0 ${className}`}>
      {options.map((opt, i) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          title={opt.title}
          className={`${sizeCls} font-display font-bold ${uc} ${tr} transition-colors ${i > 0 ? 'border-l border-ws-rule' : ''} ${
            opt.disabled
              ? 'text-ws-disabled cursor-not-allowed bg-ws-surface'
              : value === opt.id
              ? 'bg-ws-ink text-white'
              : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/** Big mono figure + caption — the Overview "plan state" metric idiom. */
export const StatFigure = ({ value, label, tone = 'text-ws-ink' }) => (
  <div>
    <div className={`font-mono text-[22px] font-bold leading-none ${tone}`}>{value}</div>
    <div className="font-ws text-xs text-ws-mid mt-[3px] leading-[1.35]">{label}</div>
  </div>
);

/** Text input / select controls in the worksheet idiom. */
export const WsInput = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface border border-ws-rule px-2.5 py-1.5 placeholder:text-ws-light focus:outline-none ${className}`}
  />
);

export const WsSelect = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface border border-ws-rule px-2 py-1.5 ${className}`}
  >
    {children}
  </select>
);
