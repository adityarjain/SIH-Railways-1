import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { Sidebar, NAV_SECTIONS_BY_ROLE } from './Sidebar';
import { Header, RoleSwitch } from './Header';
import { InstitutionalHeader, AppIdentity } from './InstitutionalHeader';
import { LanguageSwitch } from './LanguageSwitch';
import { DemoGuideBar } from './DemoGuideBar';

/**
 * Authority shell — dense desktop planning console. Two-level header: the
 * government identity band, then the application bar.
 */
const AuthorityShell = ({ activeTab, onTabChange, children }) => (
  <div className="min-h-screen bg-surface-base flex flex-col">
    <InstitutionalHeader />
    <div className="flex flex-1 min-h-0">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onNavigate={onTabChange} />
        <DemoGuideBar onNavigate={onTabChange} />
        <main className="flex-1 p-5 space-y-4 min-w-0">{children}</main>
      </div>
    </div>
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
  const activeGroup =
    sections.find((s) => s.items.some((i) => i.id === activeTab)) || sections[0];

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <InstitutionalHeader compact />

      <header className="bg-rail-900 border-b border-rail-800 px-5 py-2.5 flex items-center gap-4 sticky top-0 z-header">
        <AppIdentity sub={t('role.ground')} />
        <div className="flex-1" />
        <div className="text-right min-w-0 hidden sm:block">
          <div className="text-[11px] font-semibold text-white truncate">
            {currentUser?.department}
          </div>
          <div className="font-mono text-[9px] text-rail-400 truncate">
            {currentUser?.name}
          </div>
        </div>
        <LanguageSwitch tone="dark" className="hidden md:flex" />
        <RoleSwitch onNavigate={onTabChange} />
      </header>

      {/* Group tabs, then the pages within the active group. */}
      <div className="bg-surface-panel border-b border-line sticky top-[57px] z-guide">
        <div className="px-5 flex items-stretch overflow-x-auto custom-scrollbar">
          {sections.map((s) => {
            const active = s.groupKey === activeGroup.groupKey;
            return (
              <button
                key={s.groupKey}
                onClick={() => onTabChange(s.items[0].id)}
                className={`px-4 py-3 text-[11px] font-semibold tracking-wide whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active ? 'border-status-info text-rail-900' : 'border-transparent text-rail-500 hover:text-rail-700'
                }`}
              >
                {t(s.groupKey)}
              </button>
            );
          })}
        </div>
        {activeGroup.items.length > 1 && (
          <div className="px-5 py-2 flex items-center gap-1.5 bg-surface-sunken border-t border-line overflow-x-auto custom-scrollbar">
            {activeGroup.items.map((i) => {
              const active = i.id === activeTab;
              return (
                <button
                  key={i.id}
                  onClick={() => onTabChange(i.id)}
                  className={`px-3 py-1.5 text-[11px] font-medium whitespace-nowrap border rounded-sm transition-colors ${
                    active
                      ? 'bg-rail-900 text-white border-rail-900'
                      : 'bg-surface-panel text-rail-600 border-line hover:border-line-strong'
                  }`}
                >
                  {t(i.labelKey)}
                </button>
              );
            })}
          </div>
        )}
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
