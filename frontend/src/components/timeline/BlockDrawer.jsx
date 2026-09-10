import React from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { Clock, Calendar, Users, Layers, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

export const BlockDrawer = ({ task, isOpen, onClose, onOpenWhyArnav }) => {
  if (!task) return null;

  const minToHhmm = (m) => {
    const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const startTime = minToHhmm(task.start_minute);
  const endTime = minToHhmm(task.end_minute);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Maintenance Block Details — ${task.task_id}`}
      subtitle={`Asset: ${task.asset_id} • Section: ${task.section_id}`}
    >
      {/* "Why did Arnav select this block?" Primary Callout Button */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 rounded-xl shadow-md border border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              OR-Tools CP-SAT Decision Trace
            </span>
          </div>
          <Badge variant="LOW" size="sm">Constraint-checked</Badge>
        </div>
        <p className="text-xs text-slate-300 mt-1">
          Explore the 5-step constraint pruning and optimization trace that selected this specific block window.
        </p>
        <button
          onClick={() => onOpenWhyArnav(task)}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all shadow-xs flex items-center justify-center gap-2"
        >
          <Sparkles size={14} />
          <span>Why Did Arnav Select This Block?</span>
        </button>
      </div>

      {/* 1. BLOCK INFORMATION */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Clock size={14} className="text-blue-600" />
          <span>Block Possession Schedule</span>
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Assigned Block(s)</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {Array.isArray(task.block_ids) ? task.block_ids.join(' + ') : task.block_ids}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Execution Window</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {startTime} – {endTime} ({task.duration_minutes}m)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Scheduled Date</span>
            <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
              <Calendar size={13} className="text-slate-400" />
              {task.date}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Location / Section</span>
            <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
              <MapPin size={13} className="text-slate-400" />
              {task.section_id} ({task.corridor_id})
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAINTENANCE WORK ORDER */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-red-600" />
          <span>Work Order & Neev Risk</span>
        </h4>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              {task.maintenance_type || 'Track Inspection / Renewal'}
            </span>
            <span className="text-[11px] text-slate-500">{task.department}</span>
          </div>
          <Badge
            variant={task.risk_score >= 80 ? 'CRITICAL' : task.risk_score >= 60 ? 'HIGH' : 'MODERATE'}
            size="md"
          >
            Neev Risk: {task.risk_score != null ? `${task.risk_score.toFixed(1)}%` : '\u2014'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <span className="text-slate-500 block text-[11px]">Asset Identifier</span>
            <span className="font-mono font-bold text-slate-800">{task.asset_id}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Optimizer Priority Score</span>
            <span className="font-mono font-bold text-slate-800">
              {task.priority_score != null ? task.priority_score.toFixed(1) : '\u2014'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Night Window Bonus</span>
            <span className="font-medium text-slate-800">
              {task.is_night ? 'Applied (00:00 - 08:00)' : 'Day Execution'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Operational Status</span>
            <Badge variant="Scheduled" size="sm">Scheduled</Badge>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNED CREW */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users size={14} className="text-emerald-600" />
          <span>Assigned Maintenance Crew</span>
        </h4>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-900 font-mono">
              {Array.isArray(task.assigned_teams) ? task.assigned_teams.join(', ') : task.assigned_teams || 'TEAM-013'}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{task.department} Specialist Team</p>
          </div>
          <Badge variant="success" size="sm">Assigned crew</Badge>
        </div>
      </div>

      {/* 4. BUNDLING DETAILS (If applicable) */}
      {task.is_bundled && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
            <Layers size={15} className="text-purple-700" />
            <span>Smart Bundled Possession (C006 & S008)</span>
          </div>
          <p className="text-xs text-purple-800 leading-relaxed">
            This task shares its possession window with compatible work in the same section:
          </p>
          <div className="bg-white/80 p-2.5 rounded-lg border border-purple-200 text-xs text-slate-800 font-mono">
            {task.bundled_with && task.bundled_with.length > 0
              ? `Shared with: ${task.bundled_with.join(', ')}`
              : 'Shared with compatible Track / Electrical team'}
          </div>
        </div>
      )}
    </Drawer>
  );
};
