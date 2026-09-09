import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Radio,
  RefreshCw,
  GitFork,
  BarChart3,
  PlayCircle,
  Wrench,
  CheckCircle2,
  HeartPulse,
  Users,
  TrainTrack,
  LogOut,
  Layers,
} from 'lucide-react';

// Single source of truth for which tabs each role can reach. App.jsx uses this
// to keep the mounted page and the sidebar from drifting apart when the role
// changes (header switcher, demo guide, or login all land here).
export const NAV_ITEMS_BY_ROLE = {
  [ROLES.OCC]: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'demand', label: 'Maintenance Demand', icon: ClipboardList },
    { id: 'block-planning', label: 'Automatic Block Planning', icon: CalendarDays, highlight: true },
    { id: 'live-ops', label: 'Live Operations', icon: Radio },
    { id: 'replanning', label: 'Replanning', icon: RefreshCw },
    { id: 'network', label: 'Network', icon: GitFork },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'simulator', label: 'Event Simulator', icon: PlayCircle },
  ],
  [ROLES.MAINTENANCE]: [
    { id: 'maint-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'My Tasks', icon: Wrench, highlight: true },
    { id: 'asset-health', label: 'Asset Health (Neev)', icon: HeartPulse },
    { id: 'teams', label: 'Team Availability', icon: Users },
    { id: 'completed', label: 'Completed Work', icon: CheckCircle2 },
  ],
  [ROLES.GENERAL]: [
    { id: 'general-verify', label: 'Completed Work', icon: CheckCircle2, highlight: true },
  ],
};

export const Sidebar = ({ activeTab, onTabChange }) => {
  const { currentUser, selectedDept, setSelectedDept, DEPARTMENTS, logout } = useAuth();
  const role = currentUser?.role || ROLES.OCC;

  const navItems = NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE[ROLES.OCC];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/30">
            <TrainTrack size={20} />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-tight uppercase">Indian Railways</h1>
            <p className="text-[11px] text-blue-400 font-semibold tracking-wider">Maintenance OR Control</p>
          </div>
        </div>

        {/* Role Tag */}
        <div className="mt-3 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Logged Role:</span>
          <span className="text-[11px] font-bold text-blue-300 truncate max-w-[130px]">{role}</span>
        </div>
      </div>

      {/* Maintenance Department Selector (Only when in Maintenance role) */}
      {role === ROLES.MAINTENANCE && (
        <div className="p-3 bg-slate-800/40 border-b border-slate-800">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Department Context
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
          {role === ROLES.OCC ? 'Operations Modules' : role === ROLES.MAINTENANCE ? 'Field Portal' : 'Public Verification'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : item.highlight
                  ? 'text-blue-300 hover:bg-slate-800/80 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Disclaimer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-slate-500 text-[10px] space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Layers size={12} className="text-blue-400" />
          <span className="font-semibold text-slate-300">Neev → Arnav → Ritvik</span>
        </div>
        <p className="leading-tight text-slate-500">
          AI-Powered Automatic Block Planning. Demo environment for Smart India Hackathon.
        </p>
        <div className="pt-1 flex items-center justify-between">
          <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-mono">
            Demo / Synthetic Data
          </span>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-red-400 flex items-center gap-1 text-[11px] transition-colors"
            title="Sign Out"
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
