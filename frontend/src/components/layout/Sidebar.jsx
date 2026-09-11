import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';

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
      group: 'OPERATIONS',
      items: [
        { id: 'overview', label: 'Overview' },
        { id: 'live-ops', label: 'Live Operations' },
        { id: 'train-impact', label: 'Train Impact' },
        { id: 'replanning', label: 'Replanning' },
      ],
    },
    {
      group: 'MAINTENANCE',
      items: [
        { id: 'demand', label: 'Risk & Tasks' },
        { id: 'block-planning', label: 'Block Planning', highlight: true },
        { id: 'maintenance-blocks', label: 'Maintenance Blocks' },
        { id: 'teams', label: 'Resources' },
      ],
    },
    {
      group: 'ANALYTICS',
      items: [
        { id: 'analytics', label: 'Risk Analytics' },
        { id: 'performance', label: 'Performance' },
        { id: 'evaluation', label: 'Evaluation' },
      ],
    },
    {
      group: 'VERIFICATION',
      items: [
        { id: 'decision-trace', label: 'Decision Trace' },
        { id: 'general-verify', label: 'Work Verification' },
        { id: 'system-verification', label: 'System Verification' },
      ],
    },
    {
      group: 'DEMO',
      items: [{ id: 'simulator', label: 'Guided Demo' }],
    },
  ],

  [ROLES.GROUND]: [
    {
      group: 'MY WORK',
      items: [
        { id: 'maint-dashboard', label: "Today's Tasks" },
        { id: 'my-tasks', label: 'Assigned Work', highlight: true },
        { id: 'active-block', label: 'Active Block' },
      ],
    },
    {
      group: 'OPERATIONS',
      items: [
        { id: 'block-status', label: 'Block Status' },
        { id: 'section-info', label: 'Section Information' },
      ],
    },
    {
      group: 'REPORTING',
      items: [
        { id: 'issues', label: 'Issues' },
        { id: 'completed', label: 'Completion / Handoff' },
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
  const role = currentUser?.role || ROLES.AUTHORITY;
  const sections = NAV_SECTIONS_BY_ROLE[role] || NAV_SECTIONS_BY_ROLE[ROLES.AUTHORITY];

  return (
    <aside className="w-56 bg-rail-950 flex flex-col h-screen sticky top-0 shrink-0 select-none border-r border-rail-800">
      <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={section.group}>
            <div className="px-4 pt-3.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-rail-500">
              {section.group}
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
                  <span className="flex-1 text-left truncate">{item.label}</span>
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
          Automatic block planning. Demonstration environment, synthetic dataset.
        </p>
        <div className="flex items-center justify-between">
          <span className="bg-rail-800 text-rail-400 text-[9px] px-1.5 py-0.5 font-mono border border-rail-700">
            SYNTHETIC
          </span>
          <button
            onClick={logout}
            className="text-rail-400 hover:text-status-critical text-[10px] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
};
