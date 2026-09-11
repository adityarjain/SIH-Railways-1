import React from 'react';
import { X } from 'lucide-react';
import { useDismissable } from '../../utils/useDismissable';

export const Drawer = ({ isOpen, onClose, title, subtitle, children, width = 'max-w-xl' }) => {
  useDismissable(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay overflow-hidden">
      <div className="absolute inset-0 bg-rail-950/45" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen ${width} bg-surface-panel shadow-overlay border-l border-line flex flex-col`}>
          <div className="px-4 py-3 border-b border-line flex items-start justify-between gap-3 bg-surface-sunken shrink-0">
            <div className="min-w-0">
              <h2 className="t-section-title">{title}</h2>
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
};
