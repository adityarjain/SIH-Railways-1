import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import corridorsSectionsData from '../../data/corridors_sections.json';
import { usePlan } from '../../context/PlanContext';
import { GitFork, Search, Zap, Gauge, MapPin, Layers } from 'lucide-react';

export const Network = ({ onNavigate }) => {
  const { scheduledTasks } = usePlan();
  const [selectedCorridorId, setSelectedCorridorId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const corridors = corridorsSectionsData.corridors;
  const sections = corridorsSectionsData.sections;

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchesCorridor = selectedCorridorId === 'ALL' || s.corridor_id === selectedCorridorId;
      const matchesSearch =
        s.section_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.section_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.corridor_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCorridor && matchesSearch;
    });
  }, [sections, selectedCorridorId, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            <GitFork size={14} className="text-blue-500" />
            <span>Railway Infrastructure Network</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Corridors & Track Sections Browser
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthetic network of 200 sections across 20 corridors, modelled on Indian Railways naming. Rerouting adjacency is a prototype covering 22 of these sections; conflicts elsewhere escalate to replanning rather than being rerouted.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total: <strong>20 Corridors</strong> • <strong>200 Sections</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Section, Name, or Corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedCorridorId}
          onChange={(e) => setSelectedCorridorId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
        >
          <option value="ALL">All Corridors (20)</option>
          {corridors.map((c) => (
            <option key={c.corridor_id} value={c.corridor_id}>
              {c.corridor_id} — {c.corridor_name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((sec) => {
          const activePossessions = scheduledTasks.filter((t) => t.section_id === sec.section_id);
          const hasCritical = activePossessions.some((t) => t.risk_score >= 80);

          return (
            <div
              key={sec.section_id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{sec.section_id}</span>
                  <h4 className="text-xs font-semibold text-slate-800 mt-0.5">{sec.section_name}</h4>
                  <p className="text-[11px] text-slate-500">{sec.corridor_name} ({sec.region})</p>
                </div>
                {activePossessions.length > 0 ? (
                  <Badge variant={hasCritical ? 'CRITICAL' : 'primary'} size="sm">
                    {activePossessions.length} Possession{activePossessions.length > 1 ? 's' : ''}
                  </Badge>
                ) : (
                  <Badge variant="LOW" size="sm">Clear</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Length</span>
                  <span className="font-bold text-slate-800">{sec.section_length_km} km</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Speed</span>
                  <span className="font-bold text-slate-800">{sec.maximum_speed_kmph} km/h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Electrified</span>
                  <span className="font-bold text-emerald-700">{sec.electrified ? '25kV AC' : 'Diesel'}</span>
                </div>
              </div>

              {activePossessions.length > 0 && (
                <div className="text-[11px] text-slate-600 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Scheduled Work:</span>
                  {activePossessions.slice(0, 2).map((t) => (
                    <div key={t.task_id} className="flex justify-between items-center text-[10px]">
                      <span className="font-mono font-semibold text-blue-600">{t.task_id}</span>
                      <span className="text-slate-500">{t.duration_minutes}m ({t.date})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
