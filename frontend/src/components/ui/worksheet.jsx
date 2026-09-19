import React from 'react';

/**
 * Shared page primitives, used by every screen rather than re-derived per
 * page. Repainted from the original worksheet idiom: the numbered region
 * prefixes, forced uppercase labels and per-row hairlines that gave every
 * screen the same dense ledger texture are gone. A heading now carries its
 * own weight, rows are separated by space, and a rule is drawn only where it
 * genuinely divides two things.
 */

/**
 * Case helper. Uppercase + letter-tracking is no longer the house style, so
 * this returns empty strings and stays only because call sites destructure
 * it. Hindi never took the caps anyway: Devanagari has no case, and the
 * tracking broke conjuncts.
 */
export const wsCase = () => ({ uc: '', tr: '' });

/**
 * Region header. `number` is accepted and deliberately ignored: ordinal
 * prefixes ("01", "02") read as filing-cabinet decoration rather than
 * information, and position on the page already communicates sequence. Kept
 * in the signature so the 55 existing call sites need no edit.
 */
export const RegionHeader = ({ title, meta, className = '' }) => (
  <div className={`flex items-baseline gap-3 pb-2.5 flex-wrap ${className}`}>
    <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ws-ink">{title}</span>
    {meta && <span className="font-mono text-[10px] text-ws-light ml-auto">{meta}</span>}
  </div>
);

/** Label/value row. Separated by space; a divider is opt-in, not automatic. */
export const FieldRow = ({ label, value, tone, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-baseline justify-between gap-4 py-[7px] px-2 -mx-2 rounded text-left ${
        onClick ? 'hover:bg-ws-tick transition-colors' : ''
      }`}
    >
      <span className="font-display text-[12px] font-medium text-ws-mid shrink-0">{label}</span>
      <span className={`font-mono text-[12px] font-medium text-right ${tone || 'text-ws-ink'}`}>{value}</span>
    </Tag>
  );
};

/**
 * Tinted fill carries the status; the hard 1px outline every pill used to
 * draw is dropped, since a page can hold a dozen of these and the outlines
 * were what turned a status into a sticker.
 */
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
    className={`inline-flex items-center rounded font-display font-semibold shrink-0 ${PILL_TONE[tone]} ${
      size === 'sm' ? 'px-1.5 py-[2px] text-[10px]' : 'px-2 py-[3px] text-[11px]'
    }`}
  >
    {children}
  </span>
);

const ADVISORY_TONE = {
  info: { bg: 'bg-status-info-tint', title: 'text-ws-barPlannedLabel' },
  idle: { bg: 'bg-ws-tick', title: 'text-ws-body' },
  warn: { bg: 'bg-status-warn-tint', title: 'text-status-warn' },
  critical: { bg: 'bg-status-critical-tint', title: 'text-ws-barCriticalLabel' },
  ok: { bg: 'bg-status-ok-tint', title: 'text-status-ok' },
};

export const AdvisoryNote = ({ tone = 'info', title, children, action }) => {
  const c = ADVISORY_TONE[tone] || ADVISORY_TONE.info;
  return (
    <div className={`rounded-lg ${c.bg} px-3.5 py-3`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {title && <div className={`font-display text-[12px] font-semibold ${c.title}`}>{title}</div>}
          <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">{children}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
};

/**
 * Segmented control. A sunken track with one raised active segment, instead
 * of a hard-bordered row of boxes with a solid black active state.
 */
export const SegmentedControl = ({ options, value, onChange, size = 'md', className = '' }) => {
  const sizeCls = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]';
  return (
    <div className={`inline-flex gap-0.5 rounded-md bg-ws-paper p-0.5 shrink-0 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          title={opt.title}
          className={`${sizeCls} rounded font-display font-semibold transition-colors ${
            opt.disabled
              ? 'text-ws-disabled cursor-not-allowed'
              : value === opt.id
              ? 'bg-ws-selected text-ws-ink'
              : 'text-ws-mid hover:text-ws-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/** Large figure + caption. The headline number on summary strips. */
export const StatFigure = ({ value, label, tone = 'text-ws-ink' }) => (
  <div>
    <div className={`font-mono text-[24px] font-semibold leading-none tracking-[-0.02em] ${tone}`}>{value}</div>
    <div className="font-ws text-[12px] text-ws-mid mt-1.5 leading-[1.35]">{label}</div>
  </div>
);

/** Text input / select controls. Focus is a ring, not a colour swap. */
export const WsInput = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface rounded-md border border-ws-rule px-3 py-2 placeholder:text-ws-light focus:outline-none focus:border-ws-info focus:ring-2 focus:ring-status-info/15 transition-colors ${className}`}
  />
);

export const WsSelect = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface rounded-md border border-ws-rule px-2.5 py-2 focus:outline-none focus:border-ws-info focus:ring-2 focus:ring-status-info/15 transition-colors ${className}`}
  >
    {children}
  </select>
);
