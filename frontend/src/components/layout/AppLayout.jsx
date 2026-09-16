import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { NAV_SECTIONS_BY_ROLE } from './Sidebar';
import { RoleSwitch } from './Header';
import { InstitutionalHeader, AppIdentity } from './InstitutionalHeader';
import { DemoGuideBar } from './DemoGuideBar';
import { WorksheetHeader } from './WorksheetHeader';

/**
 * Authority shell — the "industrial worksheet" (design 2A) chrome, sitewide.
 * Every Authority tab shares the same full-bleed provenance strip, masthead
 * and horizontal nav. Overview renders its own copy of that same
 * `WorksheetHeader` directly (it needs a day-sheet-specific masthead
 * subtitle the other tabs don't have), so the shell skips rendering it a
 * second time for that one tab only.
 *
 * Pages that compose their own dense, edge-to-edge worksheet regions (rather
 * than sitting inside the padded panel-grid column) own their own padding
 * and background, so the shell renders them full-bleed too.
 */
const FULL_BLEED_TABS = new Set([
  'overview', 'replanning', 'maintenance-blocks', 'block-planning', 'train-impact',
  'teams', 'performance', 'evaluation', 'decision-trace', 'system-verification',
  'live-ops', 'demand', 'analytics', 'general-verify', 'simulator',
]);

const AuthorityShell = ({ activeTab, onTabChange, children }) => (
  <div className="min-h-screen bg-surface-base flex flex-col">
    {activeTab !== 'overview' && <WorksheetHeader activeTab={activeTab} onNavigate={onTabChange} />}
    <DemoGuideBar onNavigate={onTabChange} />
    <main className={FULL_BLEED_TABS.has(activeTab) ? 'flex-1 min-w-0' : 'flex-1 p-5 space-y-4 min-w-0'}>
      {children}
    </main>
  </div>
);

/**
 * Ground shell — tablet-first field tool. No nav rail: a top tab strip and a
 * single content column, so the work order is the page rather than one widget
 * inside a dashboard.
 */
const GroundShell = ({ activeTab, onTabChange, children }) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const sections = NAV_SECTIONS_BY_ROLE[ROLES.GROUND];

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <InstitutionalHeader />

      {/* Header and tabs stick as one block, so the tab bar needs no hardcoded
          offset to sit under a header whose height can change. */}
      <div className="sticky top-0 z-header">
        {/* Below sm the role switch wraps to its own row rather than squeezing
            the identity down to a few letters. */}
        <header className="bg-rail-900 border-b border-rail-800 px-5 py-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap">
          <AppIdentity sub={t('role.ground')} />
          <div className="flex-1 hidden sm:block" />
          <div className="min-w-0 truncate hidden sm:block">
            <span className="text-[11px] font-semibold text-white">{currentUser?.department}</span>
            <span className="font-mono text-[9px] text-rail-400"> · {currentUser?.name}</span>
          </div>
          <RoleSwitch onNavigate={onTabChange} />
        </header>

        {/* Single row: every page is one tap away, groups marked by a rule
            rather than a second row. Previously a group tab only jumped to
            its first item, so reaching e.g. Completion took two taps
            (Reporting, then Completion) — every button here is a real leaf
            page now, so that's a tap saved as well as a row saved. */}
        <div className="bg-surface-panel border-b border-line px-5 overflow-x-auto custom-scrollbar">
          <div className="flex items-stretch">
            {sections.map((s, si) => (
              <React.Fragment key={s.groupKey}>
                {si > 0 && <span className="w-px my-2.5 bg-line shrink-0" aria-hidden="true" />}
                {s.items.map((i) => {
                  const active = i.id === activeTab;
                  return (
                    <button
                      key={i.id}
                      onClick={() => onTabChange(i.id)}
                      className={`shrink-0 px-3.5 py-3 font-display text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 -mb-px transition-colors ${
                        active ? 'border-status-info text-rail-900' : 'border-transparent text-rail-500 hover:text-rail-700 hover:border-line'
                      }`}
                    >
                      {t(i.labelKey)}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <DemoGuideBar onNavigate={onTabChange} />
      <main className="flex-1 px-5 py-4 space-y-4 max-w-[1400px] w-full mx-auto">{children}</main>
    </div>
  );
};

export const AppLayout = ({ activeTab, onTabChange, children }) => {
  const { currentUser } = useAuth();
  const Shell = currentUser?.role === ROLES.GROUND ? GroundShell : AuthorityShell;
  return (
    <Shell activeTab={activeTab} onTabChange={onTabChange}>
      {children}
    </Shell>
  );
};
