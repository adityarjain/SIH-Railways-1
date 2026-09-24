import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { RegionHeader, AdvisoryNote, WsInput, WsSelect, Pill, FieldRow } from '../../components/ui/worksheet';
import { Button } from '../../components/ui';
import { bandOf, bandTone } from '../../utils/risk';
import { minToHhmm } from '../../utils/time';

const WINDOWS = ['night', 'day', 'any'];
const datasetWindow = (task) => (task.is_night ? 'night' : 'any');

/**
 * Field requirement: the crew states what a task actually needs before it is
 * planned. Saved as an event and shown to the controlling authority; the plan
 * on screen is the optimizer's committed output and is not re-solved here.
 */
export const Requirements = () => {
  const { tasksInventory, requirements, submitRequirement } = usePlan();
  const { selectedDept } = useAuth();
  const { t } = useI18n();

  const tasks = useMemo(
    () => tasksInventory
      .filter((tk) => tk.department === selectedDept && tk.status !== 'Completed')
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    [tasksInventory, selectedDept],
  );
  const [selectedId, setSelectedId] = useState(null);
  const task = tasks.find((tk) => tk.task_id === selectedId) || tasks[0];
  const saved = task ? requirements[task.task_id] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
      <div className="bg-ws-surface border border-ws-rule px-3.5 pt-4 pb-3 min-w-0">
        <RegionHeader number="01" title={t('requirements.listTitle')} meta={t('requirements.listMeta', { count: tasks.length })} />
        <div className="border-t border-ws-rule max-h-[560px] overflow-y-auto custom-scrollbar">
          {tasks.map((tk) => {
            const band = bandOf(tk);
            const on = task && tk.task_id === task.task_id;
            return (
              <button
                key={tk.task_id}
                type="button"
                onClick={() => setSelectedId(tk.task_id)}
                aria-pressed={on}
                className={`w-full text-left px-2 py-2 border-b border-ws-hairline border-l-[3px] transition-colors ${on ? 'bg-ws-selected border-l-ws-ink' : 'border-l-transparent hover:bg-ws-paper'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-ws-ink">{tk.task_id}</span>
                  {requirements[tk.task_id] && <Pill tone="info" size="sm">{t('requirements.revised')}</Pill>}
                  <span className="flex-1" />
                  {band && <Pill tone={bandTone(band)} size="sm">{band} {tk.risk_score?.toFixed?.(1)}</Pill>}
                </span>
                <span className="block text-[12px] text-ws-mid mt-0.5">{tk.maintenance_type} · {tk.section_id}</span>
              </button>
            );
          })}
          {tasks.length === 0 && <p className="py-6 text-center text-[13px] text-ws-mid">{t('requirements.none')}</p>}
        </div>
      </div>

      {task && <RequirementForm key={task.task_id} task={task} saved={saved} onSubmit={submitRequirement} t={t} />}
    </div>
  );
};

const RequirementForm = ({ task, saved, onSubmit, t }) => {
  const [duration, setDuration] = useState(saved?.duration ?? task.required_duration_minutes);
  const [teamSize, setTeamSize] = useState(saved?.teamSize ?? task.required_team_size);
  const [windowPref, setWindowPref] = useState(saved?.window ?? datasetWindow(task));
  const [canBundle, setCanBundle] = useState(saved?.canBundle ?? !!task.can_bundle);
  const [note, setNote] = useState(saved?.note ?? '');
  const [done, setDone] = useState(false);

  const d = Number(duration);
  const n = Number(teamSize);
  const valid = Number.isInteger(d) && d >= 15 && d <= 720 && Number.isInteger(n) && n >= 1 && n <= 30;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await onSubmit(task.task_id, { duration: d, teamSize: n, window: windowPref, canBundle, note: note.trim() });
    setDone(!!ok);
  };

  return (
    <form onSubmit={submit} className="bg-ws-dossier border border-ws-rule border-t-[3px] border-t-ws-ink px-3.5 pt-4 pb-4 min-w-0 space-y-3">
      <RegionHeader number="02" title={task.task_id} meta={`${task.maintenance_type} · ${task.section_id}`} />

      <div>
        <FieldRow label={t('requirements.datasetDuration')} value={`${task.required_duration_minutes} min`} />
        <FieldRow label={t('requirements.datasetCrew')} value={task.required_team_size} />
        <FieldRow label={t('requirements.datasetWindow')} value={task.is_night ? t('requirements.window.night') : `${t('requirements.preferredStart')} ${minToHhmm(task.preferred_start_minute ?? 0)}`} />
        <FieldRow label={t('requirements.datasetBundle')} value={task.can_bundle ? t('common.yes') : t('common.no')} />
        <FieldRow label={t('requirements.deadline')} value={task.deadline} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="t-stamp block mb-1">{t('requirements.duration')}</span>
          <WsInput type="number" min={15} max={720} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full" />
        </label>
        <label className="block">
          <span className="t-stamp block mb-1">{t('requirements.crew')}</span>
          <WsInput type="number" min={1} max={30} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full" />
        </label>
        <label className="block">
          <span className="t-stamp block mb-1">{t('requirements.window.label')}</span>
          <WsSelect value={windowPref} onChange={(e) => setWindowPref(e.target.value)} className="w-full">
            {WINDOWS.map((w) => <option key={w} value={w}>{t(`requirements.window.${w}`)}</option>)}
          </WsSelect>
        </label>
        <label className="flex items-center gap-2 sm:pt-5">
          <input type="checkbox" checked={canBundle} onChange={(e) => setCanBundle(e.target.checked)} className="h-4 w-4 accent-[#1F1C17]" />
          <span className="text-[13px] text-ws-ink">{t('requirements.bundle')}</span>
        </label>
      </div>
      <label className="block">
        <span className="t-stamp block mb-1">{t('requirements.note')}</span>
        <textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full font-ws text-[13px] text-ws-ink bg-ws-surface rounded-sm border border-ws-rule hover:border-ws-mid px-3 py-2"
        />
      </label>
      {!valid && <p className="text-[12px] text-ws-critical">{t('requirements.invalid')}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" variant="primary" disabled={!valid}>{t('requirements.submit')}</Button>
        {(done || saved) && (
          <span className="text-[12px] text-ws-ok">
            {t('requirements.savedAt', { at: saved?.submittedAt || '', by: saved?.by || '' })}
          </span>
        )}
      </div>

      <AdvisoryNote tone="idle" title={t('requirements.noteTitle')}>{t('requirements.noteBody')}</AdvisoryNote>
    </form>
  );
};
