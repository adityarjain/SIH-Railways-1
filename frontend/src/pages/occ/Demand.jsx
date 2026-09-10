import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Drawer } from '../../components/common/Drawer';
import { usePlan } from '../../context/PlanContext';
import {
  Search,
  Filter,
  HeartPulse,
  Clock,
  Users,
  Calendar,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

export const Demand = ({ onNavigate }) => {
  const { tasksInventory } = usePlan();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasksInventory.filter((t) => {
      const matchesSearch =
        t.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.section_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.maintenance_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || t.department === selectedDept;
      const matchesRisk = selectedRisk === 'ALL' || t.risk_level === selectedRisk;
      const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

      return matchesSearch && matchesDept && matchesRisk && matchesStatus;
    });
  }, [tasksInventory, searchQuery, selectedDept, selectedRisk, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Maintenance Demand Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Work orders received across 4 departments, prioritized by Neev AI failure risk signals.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing <strong>{filteredTasks.length}</strong> of {tasksInventory.length} sample tasks (from 30,000 inventory)
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Task ID, Asset, Section, Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Department Filter */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
        >
          <option value="ALL">All Departments</option>
          <option value="Track / Civil Engineering">Track / Civil Engineering</option>
          <option value="Electrical / TRD">Electrical / TRD</option>
          <option value="Signal & Telecommunications (S&T)">Signal &amp; Telecommunications (S&amp;T)</option>
          <option value="Mechanical / Rolling Stock">Mechanical / Rolling Stock</option>
        </select>

        {/* Risk Filter */}
        <select
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical Risk (Neev &ge; 80)</option>
          <option value="HIGH">High Risk (60–79)</option>
          <option value="MODERATE">Moderate Risk (40–59)</option>
          <option value="LOW">Low Risk (&lt; 40)</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
        >
          <option value="ALL">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Pending">Pending Optimization</option>
          <option value="Completed">Completed</option>
        </select>

        {(searchQuery || selectedDept !== 'ALL' || selectedRisk !== 'ALL' || selectedStatus !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('ALL');
              setSelectedRisk('ALL');
              setSelectedStatus('ALL');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 13-Column Compact Enterprise Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Task ID</th>
                <th className="py-3 px-3">Maintenance Type</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Corridor</th>
                <th className="py-3 px-3">Section</th>
                <th className="py-3 px-3">Earliest</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3">Neev Risk</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTasks.map((t) => {
                const isTask5 = t.task_id === 'TASK-000005';
                return (
                  <tr
                    key={t.task_id}
                    onClick={() => setSelectedTask(t)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${
                      isTask5 ? 'bg-red-50/50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900">{t.task_id}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800 truncate max-w-[150px]">
                      {t.maintenance_type}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px] truncate max-w-[140px]">
                      {t.department}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{t.asset_id}</td>
                    <td className="py-2.5 px-3 text-slate-500">{t.corridor_id}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{t.section_id}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{t.task_date}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{t.deadline}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={t.risk_level || 'MODERATE'} size="sm">
                        {t.risk_score.toFixed(1)}% {t.risk_level}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{t.priority_score.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-slate-700">{t.required_duration_minutes}m</td>
                    <td className="py-2.5 px-3 text-slate-700">{t.required_team_size}p</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={t.status || 'Pending'} size="sm">
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Detail Drawer with Neev Prediction */}
      <Drawer
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={`Task Specifications — ${selectedTask?.task_id}`}
        subtitle={`Asset: ${selectedTask?.asset_id} • ${selectedTask?.section_id}`}
        width="max-w-xl"
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Action Callout */}
            {selectedTask.status === 'Scheduled' && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900 block">Scheduled in Automatic Block Plan</span>
                  <span className="text-[11px] text-blue-700">Conflict-free window allocated by CP-SAT</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    onNavigate('block-planning');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                >
                  <span>View in Planner</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* NEEV PREDICTION PANEL */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-md border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse size={18} className="text-red-400 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Neev AI Predictive Failure Risk
                  </h4>
                </div>
                <Badge variant={selectedTask.risk_level || 'MODERATE'} size="md">
                  {selectedTask.risk_level}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white/10 p-3.5 rounded-lg border border-white/10 font-mono">
                <div>
                  <span className="text-[11px] text-slate-300 block">Failure Risk Score:</span>
                  <span className="text-2xl font-bold text-red-400">{selectedTask.risk_score.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-300 block">30-Day Degradation:</span>
                  <span className="text-2xl font-bold text-white">
                    {selectedTask.forecast_30d_degradation ? selectedTask.forecast_30d_degradation.toFixed(1) : '71.1'}
                  </span>
                </div>
              </div>

              {/* Human-readable explanation */}
              <div className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-lg">
                <p className="font-semibold text-white mb-1">AI Diagnostic Summary:</p>
                <p>
                  &ldquo;
                  {selectedTask.risk_score >= 80
                    ? 'High failure risk detected based on asset condition, recent faults, wear and maintenance history. Asset requires immediate priority window to prevent line blockage.'
                    : selectedTask.risk_score >= 60
                    ? 'Elevated degradation trend detected. Preventive maintenance recommended within the 7-day planning horizon.'
                    : 'Normal asset operating parameters. Standard scheduled maintenance cycle satisfies safety bounds.'}
                  &rdquo;
                </p>
              </div>
            </div>

            {/* MAINTENANCE INFORMATION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Work Order Requirements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Maintenance Type</span>
                  <span className="font-bold text-slate-800">{selectedTask.maintenance_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Department</span>
                  <span className="font-medium text-slate-800">{selectedTask.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Required Duration</span>
                  <span className="font-bold font-mono text-slate-800">{selectedTask.required_duration_minutes} minutes</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Required Team Size</span>
                  <span className="font-bold font-mono text-slate-800">{selectedTask.required_team_size} crew members</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Earliest Allowed Date</span>
                  <span className="font-medium text-slate-800">{selectedTask.task_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Hard Deadline</span>
                  <span className="font-bold font-mono text-red-600">{selectedTask.deadline}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
