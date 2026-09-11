import React from 'react';
import { Panel, PanelHeader, PanelBody, StatusBadge, NotAvailable, Button } from '../ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import corridors from '../../data/corridors_sections.json';
import teamsData from '../../data/teams.json';
import decisionTrace from '../../data/decision_trace.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));
const TEAM = Object.fromEntries(teamsData.map((t) => [t.team_id, t]));

export const statusTone = (status) => {
  if (!status) return 'idle';
  if (status === 'Completed' || status === 'Accepted') return 'ok';
  if (status === 'In Progress') return 'info';
  if (status.startsWith('Rejected')) return 'critical';
  if (status.startsWith('Reschedule') || status === 'Replanned') return 'warn';
  return 'idle';
};

/** Window text, or the honest "not yet scheduled" state. */
export const windowText = (task) => {
  if (task.start_minute == null || task.end_minute == null) return null;
  return `${minToHhmm(task.start_minute)} → ${minToHhmm(task.end_minute)}`;
};

/* ------------------------------------------------------------- fact strip */

const Fact = ({ label, value, sub, tone }) => (
  <div className="bg-surface-panel px-4 py-3">
    <div className="t-label">{label}</div>
    <div className={`font-mono text-[15px] font-bold mt-1 ${tone || 'text-rail-900'}`}>{value}</div>
    {sub && <div className="text-[10px] text-rail-400 mt-0.5">{sub}</div>}
  </div>
);

export const WorkOrderFacts = ({ task }) => {
  const crewId = (task.assigned_teams || [])[0];
  const crew = crewId ? TEAM[crewId] : null;
  const sec = SECTION[task.section_id];
  const win = windowText(task);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border-y border-line">
      <Fact
        label="Window"
        value={win || 'Not scheduled'}
        sub={win ? `${task.required_duration_minutes ?? task.duration_minutes ?? '—'} minutes` : `due ${task.deadline || '—'}`}
        tone={win ? undefined : 'text-status-warn'}
      />
      <Fact label="Section" value={task.section_id} sub={sec?.section_name || task.corridor_id} />
      <Fact
        label="Block"
        value={(task.block_ids || []).length ? (task.block_ids || []).join(' + ') : 'Not assigned'}
        sub={(task.block_ids || []).length ? `${task.block_ids.length} chained possession${task.block_ids.length > 1 ? 's' : ''}` : undefined}
        tone={(task.block_ids || []).length ? undefined : 'text-status-warn'}
      />
      <Fact
        label="Crew"
        value={crewId || 'Not assigned'}
        sub={crew ? `${crew.crew_size ?? crew.team_size} available · ${task.required_team_size ?? '—'} required` : undefined}
      />
    </div>
  );
};

/* -------------------------------------------------- section safety context */

/**
 * Derived ONLY from real columns, each labelled with the column it came from.
 * No safety procedure is inferred: `electrified: Yes` is reported as a section
 * attribute and is never turned into an isolation instruction.
 */
export const SectionContext = ({ task }) => {
  const sec = SECTION[task.section_id];
  const traceMatches = decisionTrace.request?.section_id === task.section_id;
  const adjacent = traceMatches ? (decisionTrace.train_impact?.adjacent || []).length : null;

  const rows = [
    sec && { label: 'Electrified', value: sec.electrified, source: 'electrified' },
    sec && { label: 'Track type', value: sec.track_type, source: 'track_type' },
    sec && { label: 'Line speed', value: `${sec.maximum_speed_kmph} kmph`, source: 'maximum_speed_kmph' },
    sec && { label: 'Section length', value: `${sec.section_length_km} km`, source: 'section_length_km' },
    { label: 'Night possession', value: task.is_night ? 'Yes' : 'No', source: 'blocks.night_preference' },
    adjacent != null && { label: 'Adjacent services', value: String(adjacent), source: 'decision_trace.json' },
  ].filter(Boolean);

  return (
    <Panel>
      <PanelHeader title="Section context" scope={sec ? `${sec.section_name} · ${sec.region}` : task.section_id} />
      {rows.map((r) => (
        <div key={r.label} className="px-3 py-2 border-b border-line last:border-b-0 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs font-medium text-rail-900">{r.label}</span>
            <span className="block font-mono text-[9px] text-rail-400 mt-0.5">source: {r.source}</span>
          </span>
          <span className="font-mono text-xs font-bold text-rail-900 shrink-0">{r.value}</span>
        </div>
      ))}
    </Panel>
  );
};

/** Explicit data-boundary disclosure — an intentional statement, not an error. */
export const OperationalGaps = () => (
  <Panel>
    <PanelHeader title="Operational information not available" scope="Absent from the current dataset" />
    <NotAvailable label="Work instructions" reason="no source column in the dataset" />
    <NotAvailable label="Equipment / machine assignment" reason="no equipment identifiers exist in the dataset" />
    <NotAvailable label="Detailed isolation procedure" reason="no source column in the dataset" />
    <PanelBody className="border-t border-line">
      <p className="text-[10px] text-rail-400 leading-relaxed">
        No safety procedure is inferred from the section attributes above. These fields have no
        source column, so they are shown as absent rather than generated.
      </p>
    </PanelBody>
  </Panel>
);

/* ------------------------------------------------------------ action bar */

/**
 * Large, touch-sized controls. Report-issue is deliberately separated from
 * Complete so a mis-tap cannot close a possession that actually went wrong.
 */
export const ActionBar = ({ status, onAction, disabled }) => {
  const started = status === 'In Progress';
  const done = status === 'Completed';

  if (done) {
    return (
      <div className="px-4 py-4 bg-status-ok-tint border-t border-line flex items-center gap-2.5">
        <StatusBadge tone="ok" size="lg">Completed</StatusBadge>
        <span className="text-xs text-rail-600">Awaiting verification by Authority.</span>
        <div className="flex-1" />
        <Button size="lg" variant="secondary" onClick={() => onAction('handoff')}>Handoff record</Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-t border-line flex flex-col sm:flex-row gap-2.5">
      {!started ? (
        <Button size="lg" variant="primary" className="flex-1" disabled={disabled} onClick={() => onAction('in_progress')}>
          START WORK
        </Button>
      ) : (
        <>
          <Button size="lg" variant="secondary" className="flex-1" onClick={() => onAction('pause')}>PAUSE</Button>
          <Button size="lg" variant="primary" className="flex-1" onClick={() => onAction('completed')}>COMPLETE</Button>
        </>
      )}
      <div className="sm:w-3" />
      <Button size="lg" variant="warn" onClick={() => onAction('issue')}>REPORT ISSUE</Button>
    </div>
  );
};

/* --------------------------------------------------------------- summary */

export const WorkOrderHeader = ({ task, status, note }) => {
  const band = bandOf(task);
  return (
    <div className="px-4 py-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="t-label">Work order</div>
        <div className="font-mono text-[22px] font-bold text-rail-900 mt-1 leading-none">{task.task_id}</div>
        <div className="text-[13px] font-medium text-rail-900 mt-1.5">
          {task.maintenance_type} · {task.department}
        </div>
        <div className="font-mono text-[10px] text-rail-400 mt-1">
          asset {task.asset_id}{task.asset_type ? ` · ${task.asset_type}` : ''}
        </div>
        {note && <div className="text-[11px] text-status-warn mt-1.5">{note}</div>}
      </div>
      <div className="text-right shrink-0 space-y-1.5">
        {band && (
          <StatusBadge tone={bandTone(band)} size="lg">
            {band} · RISK {task.risk_score?.toFixed?.(1) ?? task.risk_score}
          </StatusBadge>
        )}
        {task.failure_probability_30d != null && (
          <div className="font-mono text-[10px] text-rail-400">
            30-day failure probability {(task.failure_probability_30d * 100).toFixed(2)}%
          </div>
        )}
        <div><StatusBadge tone={statusTone(status)} size="md">{status || 'Scheduled'}</StatusBadge></div>
      </div>
    </div>
  );
};

/** Block state banner — derived from the record, never asserted. */
export const BlockStatusBanner = ({ task, status }) => {
  const hasBlock = (task.block_ids || []).length > 0;
  const started = status === 'In Progress';
  const tone = !hasBlock ? 'warn' : started ? 'info' : 'ok';
  const label = !hasBlock ? 'NO BLOCK ASSIGNED' : started ? 'POSSESSION ACTIVE' : 'BLOCK APPROVED';
  const detail = !hasBlock
    ? 'This task has not been placed in a block possession yet.'
    : `${task.is_night ? 'night possession' : 'day possession'} · ${started ? 'work in progress' : 'not yet started'}`;

  const bg = tone === 'ok' ? 'bg-status-ok-tint' : tone === 'info' ? 'bg-status-info-tint' : 'bg-status-warn-tint';
  const fg = tone === 'ok' ? 'text-status-ok' : tone === 'info' ? 'text-status-info' : 'text-status-warn';

  return (
    <div className={`px-4 py-3 ${bg} border-t border-line flex items-center gap-2.5`}>
      <span className={`h-2 w-2 rounded-full ${tone === 'ok' ? 'bg-status-ok' : tone === 'info' ? 'bg-status-info' : 'bg-status-warn'}`} />
      <span className={`text-[11px] font-bold tracking-wide ${fg}`}>{label}</span>
      <span className="text-[11px] text-rail-500">· {detail}</span>
    </div>
  );
};

export { SECTION, TEAM };
