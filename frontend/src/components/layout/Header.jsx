import React from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useDemoGuide } from '../../context/DemoGuideContext';
import { usePlan } from '../../context/PlanContext';
import { Clock, ShieldCheck, Compass, User, AlertTriangle } from 'lucide-react';

export const Header = () => {
  const { currentUser, login, logout, ROLES: ALL_ROLES } = useAuth();
  const { isGuideActive, toggleGuide, currentStepIndex, totalSteps } = useDemoGuide();
  const { activeEvent, isReplanned } = usePlan();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: System Status & Horizon */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Simulation Active</span>
        </div>

        <span
          className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
          title="This interface runs on a synthetic dataset and simulated operational events. It is not connected to any railway system."
        >
          Synthetic Data
        </span>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Clock size={13} className="text-slate-400" />
          <span>Active Plan Horizon: <strong className="text-slate-800 font-mono">03 Sep – 09 Sep 2026</strong></span>
        </div>

        {activeEvent && (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium animate-pulse">
            <AlertTriangle size={12} className="text-amber-600" />
            <span>Simulation Event: {activeEvent.name}</span>
          </div>
        )}

        {isReplanned && (
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <span>Replanned State Active (08 Sep)</span>
          </div>
        )}
      </div>

      {/* Right: Demo Guide Toggle & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* SIH Demo Guided Tour Button */}
        <button
          onClick={toggleGuide}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isGuideActive
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <Compass size={14} className={isGuideActive ? 'animate-spin' : ''} />
          <span>SIH Demo Guide {isGuideActive ? `(Step ${currentStepIndex + 1}/${totalSteps})` : 'Mode'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Quick Role Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400" />
          <select
            value={currentUser?.role || ALL_ROLES.OCC}
            onChange={(e) => login(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value={ALL_ROLES.OCC}>Role: Operations Control Center</option>
            <option value={ALL_ROLES.MAINTENANCE}>Role: Maintenance Personnel</option>
            <option value={ALL_ROLES.GENERAL}>Role: General User / Verification</option>
          </select>
        </div>
      </div>
    </header>
  );
};
