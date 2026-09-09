import React, { useState } from 'react';

import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { PlanContext_Provider } from './context/PlanContext';
import { DemoGuideProvider } from './context/DemoGuideContext';

import { AppLayout } from './components/layout/AppLayout';
import { NAV_ITEMS_BY_ROLE } from './components/layout/Sidebar';
import { Login } from './pages/Login';

import { Overview } from './pages/occ/Overview';
import { Demand } from './pages/occ/Demand';
import { BlockPlanning } from './pages/occ/BlockPlanning';
import { LiveOps } from './pages/occ/LiveOps';
import { Replanning } from './pages/occ/Replanning';
import { Network } from './pages/occ/Network';
import { Analytics } from './pages/occ/Analytics';
import { Simulator } from './pages/occ/Simulator';

import { MaintDashboard } from './pages/maintenance/MaintDashboard';
import { MyTasks } from './pages/maintenance/MyTasks';
import { AssetHealth } from './pages/maintenance/AssetHealth';
import { TeamAvailability } from './pages/maintenance/TeamAvailability';
import { CompletedWork } from './pages/maintenance/CompletedWork';

import { GeneralPortal } from './pages/general/GeneralPortal';

// Tab ids are the ones the Sidebar emits; keep them in sync with Sidebar.jsx.
const PAGES = {
  overview: Overview,
  demand: Demand,
  'block-planning': BlockPlanning,
  'live-ops': LiveOps,
  replanning: Replanning,
  network: Network,
  analytics: Analytics,
  simulator: Simulator,

  'maint-dashboard': MaintDashboard,
  'my-tasks': MyTasks,
  'asset-health': AssetHealth,
  teams: TeamAvailability,
  completed: CompletedWork,

  'general-verify': GeneralPortal,
};

// A role's first nav item is its landing page.
const landingTab = (role) => (NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE[ROLES.OCC])[0].id;

const roleCanReach = (role, tab) =>
  (NAV_ITEMS_BY_ROLE[role] || []).some((item) => item.id === tab);

function AppShell() {
  const { currentUser, login } = useAuth();
  const [activeTab, setActiveTab] = useState(landingTab(ROLES.OCC));

  if (!currentUser) {
    return <Login onLoginSuccess={(role) => setActiveTab(landingTab(role))} />;
  }

  // The demo guide walks across roles (step 14 hands off to the maintenance
  // crew), so a navigation request carries the role its page belongs to.
  const handleNavigate = (page, role) => {
    if (role && role !== currentUser.role) {
      login(role);
    }
    if (page) {
      setActiveTab(page);
    }
  };

  // The header's role switcher calls login() directly, so the tab can be left
  // pointing at a page the new role has no nav entry for. Resolve against the
  // role rather than trusting activeTab, which covers every switch path.
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
