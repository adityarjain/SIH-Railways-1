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
    <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-ws-ink t-emboss">{title}</span>
    {meta && <span className="t-scope ml-auto">{meta}</span>}
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
 * Stamped status badge: tinted fill, mono uppercase legend.
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
    className={`inline-flex items-center rounded-sm font-mono font-bold uppercase tracking-[0.04em] shrink-0 ${PILL_TONE[tone]} ${
      size === 'sm' ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-[3px] text-[10px]'
    }`}
  >
    {children}
  </span>
);

// A notice is a recessed display window with a status LED beside its title.
const ADVISORY_LED = {
  info: 'bg-ws-steel',
  idle: 'bg-ws-disabled',
  warn: 'bg-[#E0A800] shadow-[0_0_8px_1px_rgba(224,168,0,0.7)]',
  critical: 'bg-[#D63031] shadow-led-critical',
  ok: 'bg-[#22C55E] shadow-led-ok',
};

export const AdvisoryNote = ({ tone = 'info', title, children, action }) => (
  <div className="rounded-md bg-ws-tick shadow-recessed px-4 py-3">
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        {title && (
          <div className="flex items-center gap-2">
            <span className={`led ${ADVISORY_LED[tone] || ADVISORY_LED.info}`} aria-hidden="true" />
            <span className="t-stamp text-ws-ink">{title}</span>
          </div>
        )}
        <div className="font-ws text-xs text-ws-body leading-relaxed mt-1.5">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

/**
 * Segmented control: a recessed track holding a row of keys; the selected
 * key stands proud of the track.
 */
export const SegmentedControl = ({ options, value, onChange, size = 'md', className = '' }) => {
  const sizeCls = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]';
  return (
    <div className={`inline-flex rounded-md bg-ws-tick shadow-recessed p-1 gap-1 shrink-0 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          title={opt.title}
          className={`${sizeCls} rounded font-mono font-bold uppercase tracking-[0.05em] transition-all duration-150 ease-spring ${
            opt.disabled
              ? 'text-ws-disabled cursor-not-allowed'
              : value === opt.id
              ? 'bg-ws-surface text-ws-ink shadow-key'
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
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface rounded-md shadow-recessed border-0 px-3.5 py-2 font-mono placeholder:text-ws-disabled focus:outline-none focus:shadow-[inset_3px_3px_6px_#BABECC,inset_-3px_-3px_6px_#FFFFFF,0_0_0_2px_#FF6B1A] ${className}`}
  />
);

export const WsSelect = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`font-ws text-[13px] text-ws-ink bg-ws-surface rounded-md shadow-recessed border-0 px-3 py-2 focus:outline-none focus:shadow-[inset_3px_3px_6px_#BABECC,inset_-3px_-3px_6px_#FFFFFF,0_0_0_2px_#FF6B1A] ${className}`}
  >
    {children}
  </select>
);
