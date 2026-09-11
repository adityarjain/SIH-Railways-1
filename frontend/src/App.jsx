import React, { useState } from 'react';

import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { PlanContext_Provider } from './context/PlanContext';
import { DemoGuideProvider } from './context/DemoGuideContext';

import { AppLayout } from './components/layout/AppLayout';
import { NAV_ITEMS_BY_ROLE } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { StyleGuide } from './pages/StyleGuide';

// Authority
import { Overview } from './pages/occ/Overview';
import { Demand } from './pages/occ/Demand';
import { BlockPlanning } from './pages/occ/BlockPlanning';
import { LiveOps } from './pages/occ/LiveOps';
import { Replanning } from './pages/occ/Replanning';
import { Analytics } from './pages/occ/Analytics';
import { Simulator } from './pages/occ/Simulator';
import { TeamAvailability } from './pages/maintenance/TeamAvailability';
import { GeneralPortal } from './pages/general/GeneralPortal';
import { TrainImpact } from './pages/authority/TrainImpact';
import { MaintenanceBlocks } from './pages/authority/MaintenanceBlocks';
import { Performance } from './pages/authority/Performance';
import { Evaluation } from './pages/authority/Evaluation';
import { DecisionTrace } from './pages/authority/DecisionTrace';
import { SystemVerification } from './pages/authority/SystemVerification';

// Ground Operations
import { MaintDashboard } from './pages/maintenance/MaintDashboard';
import { MyTasks } from './pages/maintenance/MyTasks';
import { CompletedWork } from './pages/maintenance/CompletedWork';
import { ActiveBlock } from './pages/ground/ActiveBlock';
import { BlockStatus } from './pages/ground/BlockStatus';
import { SectionInfo } from './pages/ground/SectionInfo';
import { Issues } from './pages/ground/Issues';

/**
 * Tab ids are load-bearing: they key this map, the reachability guard, and
 * DEMO_STEPS[].page. Labels live in Sidebar.jsx and are free to change; ids are
 * not, which is why several keep names from the previous information
 * architecture (`demand`, `general-verify`, `simulator`).
 */
const PAGES = {
  // Authority
  overview: Overview,
  'live-ops': LiveOps,
  'train-impact': TrainImpact,
  replanning: Replanning,
  demand: Demand,
  'block-planning': BlockPlanning,
  'maintenance-blocks': MaintenanceBlocks,
  teams: TeamAvailability,
  analytics: Analytics,
  performance: Performance,
  evaluation: Evaluation,
  'decision-trace': DecisionTrace,
  'general-verify': GeneralPortal,
  'system-verification': SystemVerification,
  simulator: Simulator,

  // Ground Operations
  'maint-dashboard': MaintDashboard,
  'my-tasks': MyTasks,
  'active-block': ActiveBlock,
  'block-status': BlockStatus,
  'section-info': SectionInfo,
  issues: Issues,
  completed: CompletedWork,
};

/** A role's first nav item is its landing page. */
const landingTab = (role) =>
  (NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE[ROLES.AUTHORITY])[0].id;

const roleCanReach = (role, tab) =>
  (NAV_ITEMS_BY_ROLE[role] || []).some((item) => item.id === tab);

function AppShell() {
  const { currentUser, login } = useAuth();
  const [activeTab, setActiveTab] = useState(landingTab(ROLES.AUTHORITY));

  if (!currentUser) {
    return <Login onLoginSuccess={(role) => setActiveTab(landingTab(role))} />;
  }

  /**
   * The single navigation entry point. The guided demo crosses roles (step 13
   * hands off to the crew, step 14 returns to Authority), so a navigation
   * request carries the role its page belongs to.
   */
  const handleNavigate = (page, role) => {
    if (role && role !== currentUser.role) {
      login(role);
      // Switching role without a target page lands on that role's own landing
      // tab rather than stranding the user on a page it cannot reach.
      setActiveTab(page || landingTab(role));
      return;
    }
    if (page) setActiveTab(page);
  };

  // Resolve against the role rather than trusting activeTab, so no switch path
  // can leave the shell pointing at a page this role has no nav entry for.
  const tab = roleCanReach(currentUser.role, activeTab)
    ? activeTab
    : landingTab(currentUser.role);
  const Page = PAGES[tab] || Overview;

  return (
    <AppLayout activeTab={tab} onTabChange={handleNavigate}>
      <Page onNavigate={handleNavigate} />
    </AppLayout>
  );
}

export default function App() {
  // Development reference for the design system. Not part of either operational
  // role, and reachable only by explicit URL.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/style-guide')) {
    return <StyleGuide />;
  }

  return (
    <AuthProvider>
      <PlanContext_Provider>
        <DemoGuideProvider>
          <AppShell />
        </DemoGuideProvider>
      </PlanContext_Provider>
    </AuthProvider>
  );
}
