import React, { useMemo } from 'react';
import { useI18n } from '../../i18n';
import topology from '../../data/route_topology.json';

const NODE_W = 78;
const NODE_H = 26;
const COL = 118;
const ROW = 44;

/**
 * The reroute search the replanner actually ran, drawn on the section graph
 * it searched. Nodes and edges come from route_topology.json (the synthetic
 * topology the rerouting engine reads); every candidate path and its
 * rejection reason come from the replan artifact. Nothing is inferred beyond
 * reading the blocking section out of each recorded reason.
 */
export const RerouteDiagram = ({ routes = [], possessionSection }) => {
  const { t } = useI18n();

  const layout = useMemo(() => {
    const paths = routes.map((r) => r.path.split(/\s*->\s*/));
    const nodes = new Set(paths.flat());
    const graph = topology.topology || {};
    const edges = [];
    for (const n of nodes) for (const m of graph[n] || []) if (nodes.has(m)) edges.push([n, m]);

    // Column = longest distance from the start along recorded edges.
    const start = paths[0]?.[0];
    const col = { [start]: 0 };
    for (let changed = true, guard = 0; changed && guard < 50; guard += 1) {
      changed = false;
      for (const [a, b] of edges) {
        if (col[a] != null && (col[b] == null || col[b] < col[a] + 1)) { col[b] = col[a] + 1; changed = true; }
      }
    }
    const byCol = {};
    for (const n of nodes) (byCol[col[n] ?? 0] ||= []).push(n);
    const rows = Math.max(...Object.values(byCol).map((l) => l.length));
    const pos = {};
    for (const [c, list] of Object.entries(byCol)) {
      list.sort();
      const offset = ((rows - list.length) * ROW) / 2;
      list.forEach((n, i) => { pos[n] = { x: 10 + Number(c) * COL, y: 10 + offset + i * ROW }; });
    }
    const blocked = {};
    routes.forEach((r) => {
      const hit = r.reason?.match(/SEC-\d{4}/)?.[0];
      if (hit) (blocked[hit] ||= new Set()).add(r.reason);
    });
    const cols = Math.max(...Object.keys(byCol).map(Number)) + 1;
    return { nodes: [...nodes], edges, pos, blocked, width: 20 + (cols - 1) * COL + NODE_W, height: 20 + (rows - 1) * ROW + NODE_H };
  }, [routes]);

  if (!routes.length) return null;
  const { nodes, edges, pos, blocked, width, height } = layout;

  return (
    <div>
      <div className="overflow-x-auto custom-scrollbar">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width, maxWidth: '100%', minWidth: Math.min(width, 520) }} role="img" aria-label={t('reroute.aria')}>
          <defs>
            <marker id="rr-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#7A7263" />
            </marker>
          </defs>
          {edges.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={pos[a].x + NODE_W} y1={pos[a].y + NODE_H / 2}
              x2={pos[b].x - 2} y2={pos[b].y + NODE_H / 2}
              stroke="#BEB6A7" strokeWidth="1.5" markerEnd="url(#rr-arrow)"
            />
          ))}
          {nodes.map((n) => {
            const isBlocked = !!blocked[n];
            const isPossession = n === possessionSection;
            return (
              <g key={n}>
                <rect
                  x={pos[n].x} y={pos[n].y} width={NODE_W} height={NODE_H}
                  fill={isPossession ? '#1F1C17' : isBlocked ? '#F7E4E1' : '#FFFFFF'}
                  stroke={isBlocked ? '#B22A22' : '#1F1C17'} strokeWidth={isBlocked ? 2 : 1}
                />
                <text
                  x={pos[n].x + NODE_W / 2} y={pos[n].y + NODE_H / 2 + 4} textAnchor="middle"
                  fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace"
                  fill={isPossession ? '#FFFFFF' : isBlocked ? '#7E1A14' : '#1F1C17'}
                >
                  {isBlocked ? `✕ ${n}` : n}
                </text>
                {isBlocked && <title>{[...blocked[n]].join(' · ')}</title>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-ws-mid">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3 bg-ws-ink" />{t('reroute.possession')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3 bg-ws-barCriticalBg border-2 border-ws-critical" />{t('reroute.blocked')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-3 bg-ws-surface border border-ws-ink" />{t('reroute.section')}</span>
      </div>
      <p className="text-[12px] text-ws-mid mt-1.5 max-w-3xl">{t('reroute.caveat')}</p>
    </div>
  );
};
