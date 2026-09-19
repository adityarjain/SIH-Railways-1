import React from 'react';
import { Pill } from '../ui/worksheet';
import { Button } from '../ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import corridors from '../../data/corridors_sections.json';
import teamsData from '../../data/teams.json';
import decisionTrace from '../../data/live/decisionTrace';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));
const TEAM = Object.fromEntries(teamsData.map((t) => [t.team_id, t]));

const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

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
  <div className="bg-ws-surface px-4 py-3">
    <div className="font-display text-[11px] font-semibold text-ws-light">{label}</div>
    <div className={`font-mono text-[15px] font-bold mt-1 ${tone || 'text-ws-ink'}`}>{value}</div>
    {sub && <div className="font-ws text-[10px] text-ws-light mt-0.5">{sub}</div>}
  </div>
);

export const WorkOrderFacts = ({ task }) => {
  const crewId = (task.assigned_teams || [])[0];
  const crew = crewId ? TEAM[crewId] : null;
  const sec = SECTION[task.section_id];
  const win = windowText(task);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ws-rule border-y border-ws-rule">
      <Fact
        label="Window"
        value={win || 'Not scheduled'}
        sub={win ? `${task.required_duration_minutes ?? task.duration_minutes ?? '—'} minutes` : `due ${task.deadline || '—'}`}
        tone={win ? undefined : 'text-ws-warn'}
      />
      <Fact label="Section" value={task.section_id} sub={sec?.section_name || task.corridor_id} />
      <Fact
        label="Block"
        value={(task.block_ids || []).length ? (task.block_ids || []).join(' + ') : 'Not assigned'}
        sub={(task.block_ids || []).length ? `${task.block_ids.length} chained possession${task.block_ids.length > 1 ? 's' : ''}` : undefined}
        tone={(task.block_ids || []).length ? undefined : 'text-ws-warn'}
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
    sec && { label: 'Electrified', value: sec.electrified ? 'Yes' : 'No', source: 'electrified' },
    sec && { label: 'Track type', value: sec.track_type, source: 'track_type' },
    sec && { label: 'Line speed', value: `${sec.maximum_speed_kmph} kmph`, source: 'maximum_speed_kmph' },
    sec && { label: 'Section length', value: `${sec.section_length_km} km`, source: 'section_length_km' },
    { label: 'Night possession', value: task.is_night ? 'Yes' : 'No', source: 'blocks.night_preference' },
    adjacent != null && { label: 'Adjacent services', value: String(adjacent), source: 'decision_trace.json' },
  ].filter(Boolean);

  return (
    <div className="border border-ws-rule bg-ws-surface">
      <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
        <span className="font-display text-[11px] font-semibold text-ws-light">Section context</span>
        <span className="font-mono text-[10px] text-ws-light block mt-0.5">{sec ? `${sec.section_name} · ${sec.region}` : task.section_id}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="px-3 py-2 border-b border-ws-hairline last:border-b-0 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-ws text-xs font-medium text-ws-ink">{r.label}</span>
            <span className="block font-mono text-[9px] text-ws-light mt-0.5">source: {r.source}</span>
          </span>
          <span className="font-mono text-xs font-bold text-ws-ink shrink-0">{r.value}</span>
        </div>
      ))}
    </div>
  );
};

/** Explicit data-boundary disclosure — an intentional statement, not an error. */
export const OperationalGaps = () => (
  <div className="border border-ws-rule bg-ws-surface">
    <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
      <span className="font-display text-[11px] font-semibold text-ws-light">Operational information not available</span>
      <span className="font-mono text-[10px] text-ws-light block mt-0.5">Absent from the current dataset</span>
    </div>
    {[
      ['Work instructions', 'no source column in the dataset'],
      ['Equipment / machine assignment', 'no equipment identifiers exist in the dataset'],
      ['Detailed isolation procedure', 'no source column in the dataset'],
    ].map(([label, reason]) => (
      <div key={label} className="px-3 py-2.5 border-b border-ws-hairline last:border-b-0 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-ws text-xs font-medium text-ws-idle">{label}</span>
          <span className="block font-ws text-[10px] text-ws-light mt-0.5">{reason}</span>
        </span>
        <span className="font-display text-[10px] font-semibold text-ws-idle shrink-0">Not available</span>
      </div>
    ))}
    <p className="px-3 py-2 font-ws text-[10px] text-ws-light leading-relaxed border-t border-ws-hairline">
      No safety procedure is inferred from the section attributes above. These fields have no
      source column, so they are shown as absent rather than generated.
    </p>
  </div>
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
      <div className="px-4 py-4 bg-[#E1EDE6] border-t border-ws-rule flex items-center gap-2.5 flex-wrap">
        <Pill tone="ok" size="md">Completed</Pill>
        <span className="font-ws text-xs text-ws-body">Awaiting verification by Authority.</span>
        <div className="flex-1" />
        <Button size="lg" variant="secondary" onClick={() => onAction('handoff')}>Handoff record</Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-t border-ws-rule flex flex-col sm:flex-row gap-2.5">
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
        <div className="font-display text-[11px] font-semibold text-ws-light">Work order</div>
        <div className="font-mono text-[22px] font-bold text-ws-ink mt-1 leading-none">{task.task_id}</div>
        <div className="font-ws text-[13px] font-medium text-ws-ink mt-1.5">{task.maintenance_type} · {task.department}</div>
        <div className="font-mono text-[10px] text-ws-light mt-1">asset {task.asset_id}{task.asset_type ? ` · ${task.asset_type}` : ''}</div>
        {note && <div className="font-ws text-[11px] text-ws-warn mt-1.5">{note}</div>}
      </div>
      <div className="text-right shrink-0 space-y-1.5">
        {band && <Pill tone={RISK_PILL[bandTone(band)] || 'idle'} size="md">{band} · RISK {task.risk_score?.toFixed?.(1) ?? task.risk_score}</Pill>}
        {task.failure_probability_30d != null && (
          <div className="font-mono text-[10px] text-ws-light">30-day failure probability {(task.failure_probability_30d * 100).toFixed(2)}%</div>
        )}
        <div><Pill tone={RISK_PILL[statusTone(status)] || 'idle'}>{status || 'Scheduled'}</Pill></div>
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

  const bg = tone === 'ok' ? 'bg-[#E1EDE6]' : tone === 'info' ? 'bg-ws-barPlannedBg' : 'bg-[#F5ECD6]';
  const fg = tone === 'ok' ? 'text-ws-ok' : tone === 'info' ? 'text-ws-info' : 'text-ws-warn';
  const dot = tone === 'ok' ? 'bg-ws-ok' : tone === 'info' ? 'bg-ws-info' : 'bg-ws-warn';

  return (
    <div className={`px-4 py-3 ${bg} border-t border-ws-rule flex items-center gap-2.5 flex-wrap`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={`font-display text-[11px] font-bold ${fg}`}>{label}</span>
      <span className="font-ws text-[11px] text-ws-mid">· {detail}</span>
    </div>
  );
};

export { SECTION, TEAM };
