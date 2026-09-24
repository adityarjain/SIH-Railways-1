import React, { useState } from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { NAV_SECTIONS_BY_ROLE } from './Sidebar';
import { TopBar, TabNav, AppFooter } from './InstitutionalHeader';
import { WorksheetHeader, MastheadContext } from './WorksheetHeader';
import { usePlan } from '../../context/PlanContext';

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
 * One shell for every role, stacked top to bottom as the worksheet reads:
 * provenance strip, masthead, tab navigation, page, footer.
 */
export const AppLayout = ({ activeTab, onTabChange, children }) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const [subtitle, setSubtitle] = useState(null);
  const { saveError, clearSaveError } = usePlan();
  const role = currentUser?.role;
  const isGround = role === ROLES.GROUND;
  const groups = (NAV_SECTIONS_BY_ROLE[role] || []).map((s) => ({
    label: t(s.groupKey),
    items: s.items.map((i) => ({ id: i.id, label: t(i.labelKey) })),
  }));

  const mainCls = isGround
    ? 'flex-1 px-3.5 md:px-4 xl:px-5 py-5 space-y-4 max-w-[1200px] w-full mx-auto'
    : FULL_BLEED_TABS.has(activeTab) ? 'flex-1 min-w-0' : 'flex-1 px-3.5 md:px-4 xl:px-5 py-5 space-y-4 min-w-0';

  return (
    <MastheadContext.Provider value={setSubtitle}>
      <div className="min-h-screen bg-ws-paper flex flex-col">
        <TopBar />
        <WorksheetHeader activeTab={activeTab} subtitle={subtitle} onNavigate={onTabChange} />
        <TabNav groups={groups} activeId={activeTab} onSelect={onTabChange} label={t(ROLE_SUB[role] || 'role.authority')} />
        <main className={`${mainCls} outline-none`}>
          {children}
        </main>
        <AppFooter />
        {saveError && (
          <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-overlay max-w-[calc(100vw-28px)] flex items-center gap-3 bg-ws-ink text-white px-4 py-2.5 shadow-overlay print:hidden">
            <span className="text-[13px]">{t('common.saveFailed')}: {saveError}</span>
            <button type="button" onClick={clearSaveError} className="font-display text-[12px] font-bold uppercase tracking-[0.1em] text-ws-disabled hover:text-white">
              {t('common.dismiss')}
            </button>
          </div>
        )}
      </div>
    </MastheadContext.Provider>
  );
};
