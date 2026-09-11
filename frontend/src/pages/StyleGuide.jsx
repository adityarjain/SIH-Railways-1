import React, { useState } from 'react';
import {
  Panel, PanelHeader, PanelBody, ScopeCaption, ProvenanceNote,
  StatusDot, StatusBadge, Metric, MetricRow, Button, Tabs, FilterBar,
  Select, TextInput, Alert, EmptyState, NotAvailable, Skeleton, DataTable,
} from '../components/ui';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { makeScale, ticksFor } from '../utils/timeScale';

const Section = ({ id, title, note, children }) => (
  <section id={id} className="space-y-2.5">
    <div>
      <h2 className="t-section-title">{title}</h2>
      {note && <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">{note}</p>}
    </div>
    {children}
  </section>
);

const Swatch = ({ name, cls }) => (
  <div className="border border-line rounded-sm overflow-hidden">
    <div className={`h-11 ${cls}`} />
    <div className="px-2 py-1.5 bg-surface-panel">
      <div className="font-mono text-[10px] text-rail-700">{name}</div>
    </div>
  </div>
);

const TONES = ['critical', 'warn', 'ok', 'info', 'idle', 'bundle'];

export const StyleGuide = () => {
  const [tab, setTab] = useState('one');
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const scale = makeScale(0, 1440);
  const ticks = ticksFor(scale, 180);

  const demoRows = [
    { id: 'TASK-000005', type: 'Rail Grinding', sec: 'SEC-0004', win: '00:00 → 03:20', risk: 81.0, band: 'critical' },
    { id: 'TASK-000015', type: 'OHE Inspection', sec: 'SEC-0004', win: '04:00 → 06:32', risk: 64.2, band: 'warn' },
    { id: 'TASK-023605', type: 'Insulator Check', sec: 'SEC-0004', win: '06:45 → 08:18', risk: 22.8, band: 'ok' },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="bg-rail-900 px-5 py-3">
        <div className="t-wordmark text-white">Railway Maintenance Operations</div>
        <div className="t-wordmark-sub text-rail-400 mt-0.5">Design system reference · /style-guide</div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-8">
        <Alert tone="info" title="Development reference">
          Every screen in this application consumes these primitives. Change them here, not
          per-screen. This route is not part of either operational role.
        </Alert>

        <Section
          id="type"
          title="Typography"
          note="Inter for interface text, JetBrains Mono for identifiers, timestamps, minutes and counts. Mono is never used for prose."
        >
          <Panel>
            <PanelBody className="space-y-3">
              <div><div className="t-label">t-label · 11px semibold uppercase</div></div>
              <div><div className="t-value">t-value · 13px medium — human-readable values</div></div>
              <div><div className="t-mono-id">t-mono-id · TASK-000005 · BLK-009637 · SEC-0004</div></div>
              <div><div className="t-metric">1,598</div><ScopeCaption>t-metric · tabular figures</ScopeCaption></div>
              <div><div className="t-section-title">t-section-title · 15px semibold</div></div>
              <div><ScopeCaption>t-scope · full run · 30,000 tasks</ScopeCaption></div>
              <div className="pt-1 border-t border-line-subtle">
                <div className="t-wordmark text-rail-900">Railway Maintenance Operations</div>
                <div className="t-wordmark-sub text-rail-500">Decision Support System — functional identity, no logo</div>
              </div>
            </PanelBody>
          </Panel>
        </Section>

        <Section
          id="colour"
          title="Colour"
          note="Chrome is deep navy. Status colour is semantic and never decorative: red blocked/critical, amber conflict/attention, green feasible/complete, blue selected/planning, grey inactive/deferred. Purple survives only for bundling, where it carries real meaning."
        >
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            <Swatch name="rail-950" cls="bg-rail-950" />
            <Swatch name="rail-900" cls="bg-rail-900" />
            <Swatch name="rail-800" cls="bg-rail-800" />
            <Swatch name="rail-700" cls="bg-rail-700" />
            <Swatch name="rail-500" cls="bg-rail-500" />
            <Swatch name="rail-400" cls="bg-rail-400" />
            <Swatch name="rail-300" cls="bg-rail-300" />
            <Swatch name="surface-sunken" cls="bg-surface-sunken" />
            <Swatch name="critical" cls="bg-status-critical" />
            <Swatch name="warn" cls="bg-status-warn" />
            <Swatch name="ok" cls="bg-status-ok" />
            <Swatch name="info" cls="bg-status-info" />
            <Swatch name="idle" cls="bg-status-idle" />
            <Swatch name="bundle" cls="bg-bundle" />
            <Swatch name="line" cls="bg-line" />
            <Swatch name="line-strong" cls="bg-line-strong" />
          </div>
        </Section>

        <Section
          id="geometry"
          title="Geometry & density"
          note="0px on tables, timelines and Gantt bars. 2px on controls. 4px on panels and modals. Structure comes from borders; shadows appear on overlays only."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-surface-panel border border-line p-3">
              <div className="t-label">rounded-none</div>
              <div className="text-xs text-rail-500 mt-1">tables · timeline · Gantt bars</div>
            </div>
            <div className="bg-surface-panel border border-line rounded-sm p-3">
              <div className="t-label">rounded-sm · 2px</div>
              <div className="text-xs text-rail-500 mt-1">buttons · inputs · badges</div>
            </div>
            <div className="bg-surface-panel border border-line rounded-lg p-3">
              <div className="t-label">rounded-lg · 4px</div>
              <div className="text-xs text-rail-500 mt-1">panels · modals · drawers</div>
            </div>
          </div>
        </Section>

        <Section id="status" title="Status indicators">
          <Panel>
            <PanelBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {TONES.map((t) => (
                  <StatusBadge key={t} tone={t}>{t}</StatusBadge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {TONES.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs text-rail-700">
                    <StatusDot tone={t} /> {t}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="critical" size="sm">sm</StatusBadge>
                <StatusBadge tone="critical" size="md">md</StatusBadge>
                <StatusBadge tone="critical" size="lg">lg</StatusBadge>
              </div>
            </PanelBody>
          </Panel>
        </Section>

        <Section id="buttons" title="Buttons" note="Ground uses size lg, which meets a 44px minimum touch target.">
          <Panel>
            <PanelBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="warn">Report issue</Button>
                <Button variant="danger">Reject</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Button size="sm" variant="secondary">sm</Button>
                <Button size="md" variant="secondary">md</Button>
                <Button size="lg" variant="primary">lg · touch target</Button>
              </div>
            </PanelBody>
          </Panel>
        </Section>

        <Section id="metrics" title="Metrics & scope captions" note="Any figure carries the artifact scope it came from, so a demo-subset number can never be read as the full run.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Panel><PanelBody><Metric label="Tasks scheduled" value="1,598" sub="5.33% of 30,000" scope="Full run" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Critical deferred" value="3,672" tone="critical" scope="Full run" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Validation" value="PASS" sub="22 / 22 checks" tone="ok" scope="Full run" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Solver" value="FEASIBLE" sub="867.82 s" tone="warn" scope="Full run" /></PanelBody></Panel>
          </div>
          <Panel className="mt-3">
            <PanelHeader title="Metric rows" scope="Dense summary panel" />
            <MetricRow label="Possessions used" value="2,248" />
            <MetricRow label="Night-window tasks" value="860" />
            <MetricRow label="Crews utilized" value="39 / 39" tone="warn" sub="all crews at capacity" />
            <MetricRow label="Track availability" value="81.6%" tone="ok" sub="27,412 of 33,600 windows" />
          </Panel>
        </Section>

        <Section id="table" title="Data table" note="28–32px rows, border-separated, no zebra striping.">
          <Panel className="overflow-hidden">
            <PanelHeader title="Maintenance demand" scope="163-task sample of the 30,000-task inventory" />
            <DataTable
              getKey={(r) => r.id}
              onRowClick={() => {}}
              columns={[
                { key: 'id', header: 'Task', render: (r) => <span className="t-mono-id">{r.id}</span> },
                { key: 'type', header: 'Type' },
                { key: 'sec', header: 'Section', render: (r) => <span className="font-mono text-[11px]">{r.sec}</span> },
                { key: 'win', header: 'Window', render: (r) => <span className="font-mono text-[11px]">{r.win}</span> },
                { key: 'risk', header: 'Risk', align: 'right', render: (r) => <span className="font-mono font-semibold">{r.risk.toFixed(1)}</span> },
                { key: 'band', header: 'Band', align: 'right', render: (r) => <StatusBadge tone={r.band} size="sm">{r.band}</StatusBadge> },
              ]}
              rows={demoRows}
            />
          </Panel>
        </Section>

        <Section id="timeline" title="Timeline primitives" note="makeScale() maps a minute domain to percentages; ticks are absolutely positioned so labels sit on their own gridline.">
          <Panel>
            <PanelBody>
              <div className="relative h-4 mb-1">
                {ticks.map((t) => (
                  <span key={t.minute} className="absolute font-mono text-[9px] text-rail-400" style={{ left: `${t.percent}%`, transform: 'translateX(-50%)' }}>
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="relative h-11 bg-surface-base border border-line-subtle">
                {ticks.map((t) => (
                  <span key={t.minute} className="absolute top-0 bottom-0 w-px bg-line-subtle" style={{ left: `${t.percent}%` }} />
                ))}
                <div className="absolute bg-status-critical flex items-center px-1.5 overflow-hidden"
                  style={{ left: `${scale.toPercent(0)}%`, width: `${scale.toWidth(0, 200)}%`, top: 3, height: 20 }}>
                  <span className="text-[9px] font-semibold text-white whitespace-nowrap">TASK-000005 · 200m</span>
                </div>
                <div className="absolute bg-rail-400" style={{ left: `${scale.toPercent(110)}%`, width: `${scale.toWidth(110, 140)}%`, top: 30, height: 6 }} />
                <div className="absolute conflict-hatch border border-status-critical" style={{ left: `${scale.toPercent(110)}%`, width: `${scale.toWidth(110, 140)}%`, top: 1, height: 34, opacity: 0.55 }} />
              </div>
              <div className="mt-2 text-[10px] text-rail-400">
                Upper lane: maintenance possession. Lower lane: train occupancy. Hatched: conflict recorded by an artifact.
              </div>
            </PanelBody>
          </Panel>
        </Section>

        <Section id="controls" title="Tabs, filters & inputs">
          <Panel>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[{ id: 'one', label: 'MY WORK', count: 3 }, { id: 'two', label: 'OPERATIONS' }, { id: 'three', label: 'REPORTING' }]}
            />
            <PanelBody>
              <FilterBar className="border-0 p-0">
                <TextInput placeholder="Search task, asset, section…" className="min-w-[220px] flex-1" />
                <Select label="Dept" defaultValue="all">
                  <option value="all">All departments</option>
                  <option value="trd">Electrical / TRD</option>
                </Select>
                <Select label="Risk" defaultValue="all">
                  <option value="all">All risk levels</option>
                  <option value="c">Critical (≥ 80)</option>
                </Select>
                <Button size="sm" variant="ghost">Clear</Button>
              </FilterBar>
            </PanelBody>
          </Panel>
        </Section>

        <Section id="feedback" title="Alerts, empty & unavailable states" note="A data gap is an intentional disclosure, not an error.">
          <div className="space-y-2.5">
            <Alert tone="critical" title="Train conflict">TRN-SIM-002 overlaps the TASK-000005 possession on SEC-0004, 01:50–02:20.</Alert>
            <Alert tone="warn" title="Replan pending">4 bypass routes rejected; the train is priority 1 and cannot be held.</Alert>
            <Alert tone="ok" title="Validation passed">22 of 22 post-solve checks satisfied.</Alert>
            <Alert tone="idle" title="Not implemented">Downstream impact is not derivable: trains.csv records one section occupancy per train with no onward itinerary.</Alert>
            <Panel>
              <PanelHeader title="Operational information not available" scope="Absent from the current dataset" />
              <NotAvailable label="Work instructions" reason="no source column" />
              <NotAvailable label="Equipment / machine assignment" reason="no equipment identifiers exist in the dataset" />
              <NotAvailable label="Detailed isolation procedure" reason="no source column" />
            </Panel>
            <Panel><EmptyState title="No train timing records available for this section/date.">Nothing is drawn rather than a placeholder bar.</EmptyState></Panel>
            <Panel><PanelBody><Skeleton /></PanelBody></Panel>
          </div>
        </Section>

        <Section id="overlays" title="Overlays">
          <Panel>
            <PanelBody className="flex gap-2">
              <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
              <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
            </PanelBody>
          </Panel>
          <Modal isOpen={modal} onClose={() => setModal(false)} title="Why this block was selected" subtitle="TASK-000005 · SEC-0004">
            <p className="text-xs text-rail-700 leading-relaxed">Modal content. Escape closes; body scroll is refcounted so nested overlays behave.</p>
          </Modal>
          <Drawer isOpen={drawer} onClose={() => setDrawer(false)} title="Maintenance block details" subtitle="TASK-000005">
            <p className="text-xs text-rail-700 leading-relaxed">Drawer content.</p>
          </Drawer>
        </Section>

        <Section id="provenance" title="Provenance" note="Engine and dataset names survive here because they are true statements about how a file was produced — never as a heading, nav label or feature name.">
          <Panel>
            <PanelBody>
              <ProvenanceNote
                generatedBy="Arnav Railway Maintenance Optimizer"
                command="PYTHONPATH=. python -m optimizer.main --data-dir Arnav_Optimizer_Clean_Dataset --output-dir <dir>"
                dataset="Arnav_Optimizer_Clean_Dataset"
                note="Demonstration on a synthetic dataset. Not connected to any railway signalling, dispatch or asset-management system."
              />
            </PanelBody>
          </Panel>
        </Section>
      </div>
    </div>
  );
};
