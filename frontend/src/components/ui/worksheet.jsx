import React from 'react';

/**
 * Shared page primitives, used by every screen rather than re-derived per
 * page. Editorial idiom: serif titles over a hairline rule, small-caps meta,
 * and structure drawn with 1px warm rules rather than boxes.
 */

/**
 * Case helper. Uppercase is carried by the `.t-stamp` / `.t-scope` classes
 * (which drop it for Hindi in CSS), so this returns empty strings and stays
 * only because call sites destructure it.
 */
export const wsCase = () => ({ uc: '', tr: '' });

/**
 * Section header: serif title, small-caps meta, hairline rule beneath.
 * `number` and `isHindi` are accepted and ignored so existing call sites need
 * no edit.
 */
export const RegionHeader = ({ title, meta, className = '' }) => (
  <div className={`flex items-baseline gap-4 pb-3 mb-4 border-b border-ws-rule flex-wrap ${className}`}>
    <h2 className="font-serif text-[21px] leading-tight text-ws-ink">{title}</h2>
    {meta && <span className="t-scope ml-auto">{meta}</span>}
  </div>
);

/** Label/value row, separated from its neighbours by a hairline. */
export const FieldRow = ({ label, value, tone, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-baseline justify-between gap-4 py-2 border-b border-ws-hairline last:border-b-0 text-left ${
        onClick ? 'hover:bg-ws-tick transition-colors duration-200' : ''
      }`}
    >
      <span className="text-[13px] text-ws-mid shrink-0">{label}</span>
      <span className={`font-mono text-[12px] text-right min-w-0 break-words ${tone || 'text-ws-ink'}`}>{value}</span>
    </Tag>
  );
};

/** Small-caps status badge on a pale tint. */
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
    className={`inline-flex items-center rounded-sm font-mono font-medium uppercase tracking-[0.1em] shrink-0 ${PILL_TONE[tone]} ${
      size === 'sm' ? 'px-1.5 py-[1px] text-[9px]' : 'px-2 py-[3px] text-[10px]'
    }`}
  >
    {children}
  </span>
);

// A notice is set like an editorial aside: a 2px coloured rule on the left.
const ADVISORY_RULE = {
  info: 'border-l-accent-bright',
  idle: 'border-l-line-strong',
  warn: 'border-l-status-warn',
  critical: 'border-l-status-critical',
  ok: 'border-l-status-ok',
};

export const AdvisoryNote = ({ tone = 'info', title, children, action }) => (
  <div className={`border-l-2 ${ADVISORY_RULE[tone] || ADVISORY_RULE.info} bg-ws-tick pl-4 pr-4 py-3`}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        {title && <div className="t-stamp text-ws-ink">{title}</div>}
        <div className="text-[13px] text-ws-body leading-relaxed mt-1">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

/**
 * Segmented control, set like a contents line: options in a row, the
 * selected one underlined in gold.
 */
export const SegmentedControl = ({ options, value, onChange, size = 'md', className = '' }) => {
  const sizeCls = size === 'sm' ? 'px-2 pt-1 pb-1.5 text-[12px]' : 'px-2.5 pt-1.5 pb-2 text-[13px]';
  return (
    <div className={`inline-flex gap-1 border-b border-ws-rule shrink-0 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          disabled={opt.disabled}
          title={opt.title}
          className={`${sizeCls} -mb-px border-b-2 font-display font-medium tracking-[0.03em] transition-colors duration-200 ease-out focus:outline-none focus-visible:shadow-focus ${
            opt.disabled
              ? 'border-transparent text-ws-disabled cursor-not-allowed'
              : value === opt.id
              ? 'border-accent-bright text-ws-ink'
              : 'border-transparent text-ws-mid hover:text-ws-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/** A figure set in the display serif, with a quiet caption. */
export const StatFigure = ({ value, label, tone = 'text-ws-ink' }) => (
  <div>
    <div className={`font-serif text-[34px] leading-none ${tone}`}>{value}</div>
    <div className="text-[13px] text-ws-mid mt-2 leading-snug">{label}</div>
  </div>
);

const FIELD = 'text-[14px] text-ws-ink bg-ws-surface rounded-md border border-ws-rule hover:border-line-strong focus:outline-none focus:border-accent-bright focus:ring-2 focus:ring-accent-bright focus:ring-offset-2 focus:ring-offset-ws-paper transition-colors duration-150 ease-out';

export const WsInput = ({ className = '', ...props }) => (
  <input {...props} className={`${FIELD} px-3.5 py-2 placeholder:text-ws-mid/60 ${className}`} />
);

export const WsSelect = ({ className = '', children, ...props }) => (
  <select {...props} className={`${FIELD} px-3 py-2 ${className}`}>
    {children}
  </select>
);
