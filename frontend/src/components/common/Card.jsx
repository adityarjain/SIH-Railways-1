import React from 'react';

/**
 * Panel with an optional header. Kept on its original prop signature so the
 * existing screens keep working; the visual language is the new one.
 */
export const Card = ({
  children, title, subtitle, action, className = '', headerClassName = '', bodyClassName = '',
}) => (
  <div className={`bg-surface-panel border border-line rounded-lg ${className}`}>
    {(title || action) && (
      <div className={`px-3 py-2.5 border-b border-line bg-surface-sunken flex items-start justify-between gap-3 rounded-t-lg ${headerClassName}`}>
        <div className="min-w-0">
          {title && <div className="t-label">{title}</div>}
          {subtitle && <div className="t-scope mt-0.5 normal-case tracking-normal">{subtitle}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className={`p-3 ${bodyClassName}`}>{children}</div>
  </div>
);
