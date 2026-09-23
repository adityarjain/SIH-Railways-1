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

/** Ivory top bar under a hairline rule. `children` sit before the language switch. */
export const TopBar = ({ children }) => {
  const { t } = useI18n();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-overlay focus:bg-accent focus:text-accent-ink focus:px-3 focus:py-2 focus:rounded-md text-sm font-semibold"
      >
        {t('institution.skipToContent')}
      </a>
      <div className="sticky top-0 z-header bg-ws-paper/95 backdrop-blur-sm border-b border-ws-rule min-h-16 py-2 px-5 md:px-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="text-ws-mid w-full sm:w-auto truncate">
          <span lang="hi" className="text-ws-ink">{t('institution.govHi')}</span>
          <span className="hidden sm:inline"> · {t('institution.ministry')}</span>
        </span>
        <span className="flex-1 hidden sm:block" />
        {children}
        <LanguageSwitch />
      </div>
    </>
  );
};

/** Top bar with nothing extra, for pages outside the app shell. */
export const InstitutionalHeader = () => <TopBar />;

/**
 * Left navigation, set like a book's contents page: serif wordmark, gold
 * small-caps section labels, and a gold rule beside the current page.
 * Desktop only. `groups`: [{ label, items: [{ id, label }] }].
 */
export const SideNav = ({ groups, activeId, onSelect, sub }) => {
  const { t } = useI18n();
  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r border-ws-rule">
      <div className="sticky top-0 h-screen flex flex-col">
        <div className="px-7 pt-8 pb-7 border-b border-ws-rule">
          <div className="font-serif text-[21px] leading-[1.2] text-ws-ink">{t('institution.appName')}</div>
          <div className="text-[12px] text-ws-mid mt-1.5 tracking-[0.02em]">{t('institution.appSub')}</div>
        </div>
        <nav aria-label={sub} className="flex-1 overflow-y-auto custom-scrollbar px-5 py-7 space-y-7">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="t-stamp !text-accent px-2 mb-2.5">{g.label}</div>
              <ul>
                {g.items.map((item) => {
                  const Icon = NAV_ICON[item.id] || LayoutDashboard;
                  const active = item.id === activeId;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onSelect && onSelect(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 pl-3 pr-2 py-[7px] border-l-2 text-[14px] text-left touch-manipulation transition-colors duration-200 ease-out focus:outline-none focus-visible:shadow-focus ${
                          active
                            ? 'border-accent-bright text-ws-ink font-semibold'
                            : 'border-transparent text-ws-mid hover:text-ws-ink'
                        }`}
                      >
                        <Icon size={15} strokeWidth={1.5} className={active ? 'text-accent' : 'text-ws-disabled'} aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
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

/** Below lg the contents collapse to one scrollable line of the same links. */
export const MobileNav = ({ groups, activeId, onSelect }) => (
  <nav className="lg:hidden border-b border-ws-rule overflow-x-auto custom-scrollbar">
    <div className="flex gap-5 px-5 whitespace-nowrap">
      {groups.flatMap((g) => g.items).map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect && onSelect(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 py-3 -mb-px border-b-2 text-[13px] touch-manipulation transition-colors duration-200 ${
              active ? 'border-accent-bright text-ws-ink font-semibold' : 'border-transparent text-ws-mid hover:text-ws-ink'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
);

/** Colophon: the non-official disclaimer, under a rule. */
export const AppFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="mt-16 mx-5 md:mx-8 border-t border-ws-rule py-8">
      <p className="text-[13px] text-ws-mid leading-relaxed max-w-3xl">{t('institution.prototypeLong')}</p>
    </footer>
  );
};
