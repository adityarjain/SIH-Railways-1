import { ROLES } from '../../context/AuthContext';

/**
 * Single source of truth for which tabs each role can reach. App.jsx derives
 * the landing tab and the reachability guard from this, so the mounted page and
 * the navigation can never drift apart when the role changes.
 *
 * Tab ids are load-bearing: they are keys in PAGES and in roleCanReach
 * simultaneously. Labels are free to change; ids are not.
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
      groupKey: 'nav.groupVerification',
      items: [
        { id: 'decision-trace', labelKey: 'nav.decisionTrace' },
        { id: 'general-verify', labelKey: 'nav.workVerification' },
      ],
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

  [ROLES.ADMIN]: [
    {
      groupKey: 'nav.groupMetrics',
      items: [
        { id: 'analytics', labelKey: 'nav.riskAnalytics' },
        { id: 'performance', labelKey: 'nav.performance' },
        { id: 'evaluation', labelKey: 'nav.evaluation' },
        { id: 'system-verification', labelKey: 'nav.systemVerification' },
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
