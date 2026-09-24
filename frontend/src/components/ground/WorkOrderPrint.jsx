import React from 'react';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import corridorsSectionsData from '../../data/corridors_sections.json';

const SECTION = Object.fromEntries(corridorsSectionsData.sections.map((s) => [s.section_id, s]));

/**
 * Printable work orders: hidden on screen, the only thing on the page when
 * printing (browser "Save as PDF" gives the PDF). Every field is from the
 * plan; the sign-off lines are left blank for the crew to fill in by hand.
 */
export const WorkOrderPrint = ({ tasks, department, requirements = {} }) => (
  <div className="hidden print:block text-[11pt] text-black">
    <h1 className="text-[16pt] font-bold">Work orders · {department}</h1>
    <p className="text-[9pt] mb-4">
      Printed {new Date().toLocaleString()} · {tasks.length} order{tasks.length === 1 ? '' : 's'} · demonstration prototype, synthetic dataset
    </p>
    {tasks.map((tk) => {
      const sec = SECTION[tk.section_id] || {};
      const req = requirements[tk.task_id];
      return (
        <section key={tk.task_id} className="border border-black p-3 mb-4 break-inside-avoid">
          <div className="flex justify-between items-baseline border-b border-black pb-1 mb-2">
            <span className="font-mono font-bold text-[13pt]">{tk.task_id}</span>
            <span>{tk.maintenance_type} · risk {tk.risk_score?.toFixed?.(1)} {bandOf(tk) || ''}</span>
          </div>
          <table className="w-full text-[10pt]">
            <tbody>
              {[
                ['Section', `${tk.section_id} · ${sec.section_name || ''} · ${sec.section_length_km ?? '—'} km · ${sec.track_type || ''}`],
                ['Date / window', tk.scheduled_date ? `${tk.scheduled_date} · ${minToHhmm(tk.start_minute)}–${minToHhmm(tk.end_minute)}` : 'Not scheduled'],
                ['Blocks', (tk.block_ids || []).join(' + ') || '—'],
                ['Crew', `${(tk.assigned_teams || []).join(', ') || '—'} · ${tk.required_team_size} required`],
                ['Asset', `${tk.asset_id} · ${tk.asset_type}`],
                ['Status', tk.status],
                ...(req ? [['Field requirement', `${req.duration} min · crew ${req.teamSize} · ${req.window} window${req.note ? ` · ${req.note}` : ''}`]] : []),
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-3 py-0.5 align-top font-bold w-[130px]">{k}</td>
                  <td className="py-0.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-4 mt-4 text-[9pt]">
            {['Crew lead signature', 'Possession cleared (time)', 'Remarks'].map((l) => (
              <div key={l}><div className="border-b border-black h-6" /><div className="mt-0.5">{l}</div></div>
            ))}
          </div>
        </section>
      );
    })}
  </div>
);
