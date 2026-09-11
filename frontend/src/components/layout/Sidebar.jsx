import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/**
 * Single source of truth for which tabs each role can reach. App.jsx derives
 * the landing tab and the reachability guard from this, so the mounted page and
 * the navigation can never drift apart when the role changes.
 *
 * Tab ids are load-bearing: they are keys in PAGES, in roleCanReach, and in
 * DEMO_STEPS[].page simultaneously. Labels are free to change; ids are not.
 */
export const NAV_SECTIONS_BY_ROLE = {
  [ROLES.AUTHORITY]: [
    {
      groupKey: 'nav.groupOperations',
      items: [
        { id: 'overview', labelKey: 'nav.overview' },
        { id: 'live-ops', labelKey: 'nav.liveOps' },
        { id: 'train-impact', labelKey: 'nav.trainImpact' },
        { id: 'replanning', labelKey: 'nav.replanning' },
      ],
    },
    {
      groupKey: 'nav.groupMaintenance',
      items: [
        { id: 'demand', labelKey: 'nav.riskTasks' },
        { id: 'block-planning', labelKey: 'nav.blockPlanning', highlight: true },
        { id: 'maintenance-blocks', labelKey: 'nav.maintenanceBlocks' },
        { id: 'teams', labelKey: 'nav.resources' },
      ],
    },
    {
      groupKey: 'nav.groupAnalytics',
      items: [
        { id: 'analytics', labelKey: 'nav.riskAnalytics' },
        { id: 'performance', labelKey: 'nav.performance' },
        { id: 'evaluation', labelKey: 'nav.evaluation' },
      ],
    },
    {
      groupKey: 'nav.groupVerification',
      items: [
        { id: 'decision-trace', labelKey: 'nav.decisionTrace' },
        { id: 'general-verify', labelKey: 'nav.workVerification' },
        { id: 'system-verification', labelKey: 'nav.systemVerification' },
      ],
    },
    {
      groupKey: 'nav.groupDemo',
      items: [{ id: 'simulator', labelKey: 'nav.guidedDemo' }],
    },
  ],

  [ROLES.GROUND]: [
    {
      groupKey: 'nav.groupMyWork',
      items: [
        { id: 'maint-dashboard', labelKey: 'nav.todaysTasks' },
        { id: 'my-tasks', labelKey: 'nav.assignedWork', highlight: true },
        { id: 'active-block', labelKey: 'nav.activeBlock' },
      ],
    },
    {
      groupKey: 'nav.groupOperations',
      items: [
        { id: 'block-status', labelKey: 'nav.blockStatus' },
        { id: 'section-info', labelKey: 'nav.sectionInfo' },
      ],
    },
    {
      groupKey: 'nav.groupReporting',
      items: [
        { id: 'issues', labelKey: 'nav.issues' },
        { id: 'completed', labelKey: 'nav.completion' },
      ],
    },
  ],
};

/** Flattened view, for landing-tab and reachability checks. */
export const NAV_ITEMS_BY_ROLE = Object.fromEntries(
  Object.entries(NAV_SECTIONS_BY_ROLE).map(([role, sections]) => [
    role,
    sections.flatMap((s) => s.items),
  ]),
);

/**
 * Authority navigation rail. Ground does not use this component at all — it has
 * its own top tab strip, because a field work tool is not a filtered version of
 * a planning console.
 */
export const Sidebar = ({ activeTab, onTabChange }) => {
  const { currentUser, logout } = useAuth();
  const { t } = useI18n();
  const role = currentUser?.role || ROLES.AUTHORITY;
  const sections = NAV_SECTIONS_BY_ROLE[role] || NAV_SECTIONS_BY_ROLE[ROLES.AUTHORITY];

  return (
    <aside className="w-56 bg-rail-950 flex flex-col h-screen sticky top-0 shrink-0 select-none border-r border-rail-800">
      <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={t(section.groupKey)}>
            <div className="px-4 pt-3.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-rail-500">
              {t(section.groupKey)}
            </div>
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-2 px-4 py-[7px] text-[11px] transition-colors border-l-2 ${
                    isActive
                      ? 'bg-rail-800 text-white font-semibold border-status-info'
                      : 'text-rail-300 hover:bg-rail-900 hover:text-white font-normal border-transparent'
                  }`}
                >
                  <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
                  {item.highlight && !isActive && (
                    <span className="h-1 w-1 rounded-full bg-status-info shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-rail-800 bg-rail-950 space-y-2">
        <p className="text-[10px] leading-snug text-rail-500">
          {t('nav.footerNote')}
        </p>
        <div className="flex items-center justify-between">
          <span className="bg-rail-800 text-rail-400 text-[9px] px-1.5 py-0.5 font-mono border border-rail-700">
            {t('nav.synthetic')}
          </span>
          <button
            onClick={logout}
            className="text-rail-400 hover:text-status-critical text-[10px] transition-colors"
          >
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </aside>
  );
};
