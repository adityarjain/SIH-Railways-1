import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';

const TONE_TEXT = { critical: 'text-ws-critical', warn: 'text-ws-warn', ok: 'text-ws-ok', info: 'text-ws-info' };
const TONE_RULE = { critical: 'border-l-ws-critical', warn: 'border-l-ws-warn', ok: 'border-l-ws-ok', info: 'border-l-ws-info' };

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/**
 * Masthead alerts: events from other people that concern this role (see
 * context/alerts.js). The count is what arrived since the last "mark read".
 */
export const AlertsMenu = ({ onNavigate }) => {
  const { alerts, unseenAlerts, markAlertsSeen } = usePlan();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('alerts.button', { count: unseenAlerts })}
        className="inline-flex items-center gap-1.5 h-[30px] px-2.5 border border-ws-rule bg-ws-surface hover:border-ws-ink transition-colors"
      >
        <Bell size={14} aria-hidden="true" className="text-ws-ink" />
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.08em] text-ws-ink">{t('alerts.title')}</span>
        {unseenAlerts > 0 && (
          <span className="font-mono text-[10px] font-bold text-white bg-ws-critical px-1 min-w-[18px] text-center">{unseenAlerts}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-overlay w-[min(360px,calc(100vw-28px))] bg-ws-surface border border-ws-ink shadow-overlay">
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-ws-rule">
            <span className="t-section-title !text-[14px]">{t('alerts.title')}</span>
            {alerts.length > 0 && (
              <button type="button" onClick={markAlertsSeen} className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-ws-mid hover:text-ws-ink">
                {t('alerts.markRead')}
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-ws-mid">{t('alerts.empty')}</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {alerts.slice(0, 30).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); if (onNavigate) onNavigate(a.tab); }}
                    className={`w-full text-left px-3 py-2 border-b border-ws-hairline border-l-[3px] hover:bg-ws-paper ${TONE_RULE[a.tone] || 'border-l-ws-rule'}`}
                  >
                    <span className={`block text-[13px] font-medium leading-snug ${TONE_TEXT[a.tone] || 'text-ws-ink'}`}>{t(a.key, a.params)}</span>
                    <span className="block font-mono text-[10px] text-ws-light mt-0.5">{when(a.ts)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
