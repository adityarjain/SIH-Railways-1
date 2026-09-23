import React from 'react';
import {
  LayoutDashboard, Radio, TrainFront, RefreshCcw, ListChecks, CalendarRange, Blocks,
  Users, GitBranch, BadgeCheck, House, ClipboardList, Timer, Activity, MapPin,
  TriangleAlert, CircleCheck, ChartColumn, Gauge, FlaskConical, ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from './LanguageSwitch';

/**
 * Application chrome shared by every role: top bar, sidebar navigation,
 * compact mobile navigation and footer.
 *
 * Identity is text only. No emblem or logo asset is shipped: the State Emblem
 * of India is restricted by the State Emblem of India (Prohibition of Improper
 * Use) Act, 2005, and no verified official Indian Railways / Ministry asset
 * was available. The footer states that this is a demonstration prototype.
 */

const NAV_ICON = {
  overview: LayoutDashboard,
  'live-ops': Radio,
  'train-impact': TrainFront,
  replanning: RefreshCcw,
  demand: ListChecks,
  'block-planning': CalendarRange,
  'maintenance-blocks': Blocks,
  teams: Users,
  'decision-trace': GitBranch,
  'general-verify': BadgeCheck,
  'maint-dashboard': House,
  'my-tasks': ClipboardList,
  'active-block': Timer,
  'block-status': Activity,
  'section-info': MapPin,
  issues: TriangleAlert,
  completed: CircleCheck,
  analytics: ChartColumn,
  performance: Gauge,
  evaluation: FlaskConical,
  'system-verification': ShieldCheck,
};

/** "OPERATIONS" -> "Operations". Devanagari has no case, so Hindi is untouched. */
const sentenceCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Chassis top bar. `children` sit to the left of the language switch. */
export const TopBar = ({ children }) => {
  const { t } = useI18n();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-overlay focus:bg-accent focus:text-accent-ink focus:px-3 focus:py-2 focus:rounded-md text-sm font-bold"
      >
        {t('institution.skipToContent')}
      </a>
      <div className="sticky top-0 z-header bg-ws-paper/95 backdrop-blur-sm border-b border-ws-rule shadow-[0_1px_0_#FFFFFF] min-h-16 py-2 px-4 md:px-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <span className="text-ws-mid w-full sm:w-auto truncate">
          <span lang="hi" className="text-ws-ink font-medium">{t('institution.govHi')}</span>
          <span className="hidden sm:inline"> · {t('institution.ministry')}</span>
        </span>
        <span className="flex-1 hidden sm:block" />
        {children}
        <LanguageSwitch tone="light" />
      </div>
    </>
  );
};

/** Top bar with nothing extra, for pages outside the app shell. */
export const InstitutionalHeader = () => <TopBar />;

/** Three recessed vent slots. */
export const Vents = () => (
  <span className="vents" aria-hidden="true"><span /><span /><span /></span>
);

/**
 * Left navigation as a bolted key bank, desktop only. The page you are on is
 * a key pressed into the panel with its LED lit.
 * `groups`: [{ label, items: [{ id, label }] }].
 */
export const SideNav = ({ groups, activeId, onSelect, sub }) => {
  const { t } = useI18n();
  return (
    <aside className="hidden lg:block w-64 shrink-0 p-3">
      <div className="sticky top-3 h-[calc(100vh-1.5rem)] flex flex-col bg-ws-surface rounded-lg shadow-panel bolted">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
          <div className="text-[15px] font-extrabold text-ws-ink leading-[1.2] tracking-[-0.01em] t-emboss">
            {t('institution.appName')}
          </div>
          <Vents />
        </div>
        <nav aria-label={sub} className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-8 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="t-stamp px-2 mb-2">{g.label}</div>
              <ul className="space-y-1.5">
                {g.items.map((item) => {
                  const Icon = NAV_ICON[item.id] || LayoutDashboard;
                  const active = item.id === activeId;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onSelect && onSelect(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-left transition-all duration-150 ease-spring focus:outline-none focus-visible:shadow-focus ${
                          active
                            ? 'shadow-pressed text-ws-ink font-semibold translate-y-[1px]'
                            : 'text-ws-body hover:shadow-key hover:text-ws-ink'
                        }`}
                      >
                        <Icon size={16} strokeWidth={1.75} className={active ? 'text-status-info' : 'text-ws-mid'} aria-hidden="true" />
                        <span className="truncate flex-1">{item.label}</span>
                        {active && <span className="led bg-accent shadow-led-accent" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

/** Below lg the key bank collapses to a recessed strip of the same keys. */
export const MobileNav = ({ groups, activeId, onSelect }) => (
  <nav className="lg:hidden px-4 pt-3 overflow-x-auto custom-scrollbar">
    <div className="inline-flex gap-1 p-1 rounded-md bg-ws-tick shadow-recessed whitespace-nowrap">
      {groups.flatMap((g) => g.items).map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect && onSelect(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 px-3 py-1.5 rounded text-[12px] transition-all duration-150 ${
              active ? 'bg-ws-surface shadow-key text-ws-ink font-semibold' : 'text-ws-mid hover:text-ws-ink'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
);

/** Charcoal base plate carrying the non-official disclaimer. */
export const AppFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="mt-10 bg-rail-900 px-4 md:px-6 py-5 flex items-start gap-3">
      <span className="led bg-accent shadow-led-accent mt-1" aria-hidden="true" />
      <p className="font-mono text-[11px] text-[#A8B2D1] leading-relaxed max-w-4xl">{t('institution.prototypeLong')}</p>
    </footer>
  );
};
