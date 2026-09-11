import React from 'react';
import { X } from 'lucide-react';
import { useDismissable } from '../../utils/useDismissable';

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-3xl' }) => {
  useDismissable(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay overflow-y-auto flex items-start justify-center p-6">
      <div className="fixed inset-0 bg-rail-950/55" onClick={onClose} />

      <div className={`relative bg-surface-panel rounded-lg shadow-overlay border border-line w-full ${maxWidth} z-10 overflow-hidden my-4`}>
        <div className="px-4 py-3 border-b border-line flex items-start justify-between gap-3 bg-surface-sunken">
          <div className="min-w-0">
            <h3 className="t-section-title">{title}</h3>
            {subtitle && <p className="text-xs text-rail-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-sm text-rail-400 hover:text-rail-900 hover:bg-line-subtle transition-colors shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-4 max-h-[76vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};
