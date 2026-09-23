import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { usePlan } from '../../context/PlanContext';
import { NAV_SECTIONS_BY_ROLE } from './Sidebar';
import { RoleSwitch } from './Header';
import { TopBar, SideNav, MobileNav, AppFooter } from './InstitutionalHeader';
import { WorksheetHeader } from './WorksheetHeader';

/**
 * Pages that compose their own edge-to-edge regions own their padding and
 * background, so the shell renders them full-bleed.
 */
const FULL_BLEED_TABS = new Set([
  'overview', 'replanning', 'maintenance-blocks', 'block-planning', 'train-impact',
  'teams', 'performance', 'evaluation', 'decision-trace', 'system-verification',
  'live-ops', 'demand', 'analytics', 'general-verify',
]);

const ROLE_SUB = {
  [ROLES.AUTHORITY]: 'role.authority',
  [ROLES.GROUND]: 'role.ground',
  [ROLES.ADMIN]: 'role.admin',
};

/**
 * One shell for every role: sidebar on the left, top bar and page on the
 * right. Overview renders its own WorksheetHeader (it passes a day-sheet
 * subtitle), so the shell skips it for that tab.
 */
export const AppLayout = ({ activeTab, onTabChange, children }) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const { baselineMetrics } = usePlan();
  const solver = baselineMetrics?.summary?.solver_status;
  const solverOk = solver === 'FEASIBLE' || solver === 'OPTIMAL';
  const role = currentUser?.role;
  const isGround = role === ROLES.GROUND;
  const groups = (NAV_SECTIONS_BY_ROLE[role] || []).map((s) => ({
    label: t(s.groupKey),
    items: s.items.map((i) => ({ id: i.id, label: t(i.labelKey) })),
  }));

  const mainCls = isGround
    ? 'flex-1 px-4 md:px-6 py-6 space-y-4 max-w-[1200px] w-full mx-auto'
    : FULL_BLEED_TABS.has(activeTab) ? 'flex-1 min-w-0' : 'flex-1 p-6 space-y-4 min-w-0';

  return (
    <div className="min-h-screen bg-ws-paper flex">
      <SideNav groups={groups} activeId={activeTab} onSelect={onTabChange} sub={t(ROLE_SUB[role] || 'role.authority')} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar>
          {solver && (
            <span className="hidden md:inline-flex items-center gap-2 t-stamp">
              <span className={`led ${solverOk ? 'bg-[#22C55E] shadow-led-ok' : 'bg-[#D63031] shadow-led-critical'}`} aria-hidden="true" />
              {t('header.solver')} {solver}
            </span>
          )}
          {isGround && (
            <span className="hidden md:inline text-ws-mid truncate">
              <span className="text-ws-ink font-medium">{currentUser?.department}</span> · {currentUser?.name}
            </span>
          )}
          <RoleSwitch onNavigate={onTabChange} tone="ws" />
        </TopBar>
        <MobileNav groups={groups} activeId={activeTab} onSelect={onTabChange} />
        {!isGround && activeTab !== 'overview' && <WorksheetHeader activeTab={activeTab} onNavigate={onTabChange} />}
        <main id={isGround ? 'main-content' : undefined} tabIndex={isGround ? -1 : undefined} className={`${mainCls} outline-none`}>
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
};
