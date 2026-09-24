import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { minToHhmm } from '../../utils/time';
import { RerouteDiagram } from '../../components/occ/RerouteDiagram';
import { RegionHeader } from '../../components/ui/worksheet';

/**
 * Replanning worksheet (design 2A idiom) — before, disruption, after, as one
 * dense record rather than three generic cards. Every value is read from
 * replan_metadata; nothing here is a string literal that could drift from
 * what the engine actually produced.
 */

const FieldRow = ({ label, value, tone }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-ws-hairline last:border-b-0">
    <span className="font-display text-[11px] font-semibold text-ws-light shrink-0">{label}</span>
    <span className={`font-mono text-[12px] font-medium text-right ${tone || 'text-ws-ink'}`}>{value}</span>
  </div>
);

const PILL_TONE = {
  critical: 'text-ws-critical border-ws-critical bg-ws-barCriticalBg',
  warn: 'text-ws-warn border-ws-warn bg-status-warn-tint',
  ok: 'text-ws-ok border-ws-ok bg-status-ok-tint',
  info: 'text-ws-info border-ws-info bg-ws-barPlannedBg',
  idle: 'text-ws-idle border-ws-rule bg-ws-tick',
};

const Pill = ({ tone = 'idle', children }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 font-display text-[9px] font-bold border shrink-0 ${PILL_TONE[tone]}`}>
    {children}
  </span>
);

const ADVISORY_TONE = {
  info: { bar: 'border-l-ws-info', title: 'text-ws-info' },
  idle: { bar: 'border-l-ws-idle', title: 'text-ws-idle' },
  warn: { bar: 'border-l-ws-warn', title: 'text-ws-warn' },
};

const AdvisoryNote = ({ tone = 'info', title, children }) => {
  const c = ADVISORY_TONE[tone] || ADVISORY_TONE.info;
  return (
    <div className={`border-l-[3px] ${c.bar} bg-ws-paper px-3 py-2.5`}>
      {title && <div className={`font-display text-[11px] font-bold ${c.title}`}>{title}</div>}
      <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">{children}</div>
    </div>
  );
};

export const Replanning = ({ onNavigate }) => {
  const { isReplanned, toggleReplan, replanMetadata, baselineMetrics } = usePlan();
  const { t, isHindi } = useI18n();

  const uc = isHindi ? '' : 'uppercase';
  const tr = isHindi ? '' : 'tracking-[0.1em]';

  if (!replanMetadata) {
    return (
      <div className="bg-ws-band min-h-full flex items-center justify-center py-24">
        <div className="text-center">
          <div className={`font-display text-sm font-semibold ${uc} ${tr} text-ws-mid`}>{t('replanning.auditRecord')}</div>
          <div className="font-ws text-xs text-ws-light mt-1">{t('replanning.noReplan')}</div>
        </div>
      </div>
    );
  }

  const m = replanMetadata;
  const before = m.original_plan || {};
  const after = m.replanned_plan || {};
  const ev = m.event || {};
  const retention = m.unaffected_plan_retention || {};
  const overlap = m.overlap_window || [];
  const overlapMins = overlap.length === 2 ? overlap[1] - overlap[0] : null;
  const rejectedRoutes = m.rejected_routes || [];

  const win = (p) => (p.start_minute != null ? `${minToHhmm(p.start_minute)} – ${minToHhmm(p.end_minute)}` : '—');

  return (
    <div className="bg-ws-band min-h-full">
      {/* intro */}
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center gap-4 flex-wrap">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed flex-1 min-w-[240px]">{t('replanning.subtitle')}</p>
        <div className="flex border border-ws-rule shrink-0">
          <button
            onClick={() => toggleReplan(false)}
            className={`px-2.5 py-1 font-display text-[11px] font-bold ${uc} ${tr} transition-colors ${
              !isReplanned ? 'bg-ws-selected text-ws-ink' : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
            }`}
          >
            {t('replanning.showOriginal')}
          </button>
          <button
            onClick={() => toggleReplan(true)}
            className={`px-2.5 py-1 border-l border-ws-rule font-display text-[11px] font-bold ${uc} ${tr} transition-colors ${
              isReplanned ? 'bg-ws-warn text-white' : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
            }`}
          >
            {t('replanning.showReplanned')}
          </button>
        </div>
      </div>

      {/* 01 — before / disruption / after */}
      <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5 pb-2.5 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-ws-light">01</span>
          <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.title')}</span>
          <span className="flex-1 min-w-6 h-px bg-ws-rule" />
          <span className="text-[12px] text-ws-mid">{m.affected_task_id} · {m.conflict_type}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-ws-rule gap-px">
        {/* before */}
        <div className="bg-ws-dossier px-3.5 md:px-4 xl:px-5 py-3.5">
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className={`font-display text-sm font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.step1')}</span>
            <Pill tone={isReplanned ? 'idle' : 'info'}>{isReplanned ? t('status.superseded') : t('status.active')}</Pill>
          </div>
          <div className="text-[12px] text-ws-mid pb-1.5">{t('replanning.step1Scope')}</div>
          <FieldRow label={t('common.task')} value={m.affected_task_id} />
          <FieldRow label={t('common.date')} value={before.date} />
          <FieldRow label={t('common.window')} value={win(before)} />
          <FieldRow label={t('common.blocks')} value={(before.block_ids || []).join(' + ')} />
          <FieldRow label={t('common.crew')} value={(before.assigned_teams || []).join(', ') || '—'} />
          <p className="font-ws text-xs text-ws-mid leading-relaxed pt-2">{t('replanning.step1Note')}</p>
        </div>

        {/* disruption */}
        <div className="bg-ws-dossier px-3.5 md:px-4 xl:px-5 py-3.5">
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className={`font-display text-sm font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.step2')}</span>
            <Pill tone="critical">{t('status.conflict')}</Pill>
          </div>
          <div className="text-[12px] text-ws-mid pb-1.5">{m.conflict_type} · {ev.event_id || ''}</div>
          <FieldRow label={t('replanning.train')} value={ev.train_id} />
          <FieldRow label={t('replanning.sectionDate')} value={`${ev.section_id} · ${ev.date}`} />
          <FieldRow
            label={t('replanning.trainOccupancy')}
            value={ev.arrival_minute != null ? `${minToHhmm(ev.arrival_minute)} – ${minToHhmm(ev.departure_minute)}` : '—'}
          />
          <FieldRow
            label={t('replanning.overlap')}
            value={overlapMins != null ? `${overlapMins} min (${minToHhmm(overlap[0])}–${minToHhmm(overlap[1])})` : '—'}
            tone="text-ws-critical font-bold"
          />
          <FieldRow label={t('replanning.affectedTrains')} value={(m.affected_trains || []).join(', ') || '—'} />

          <div className="pt-2.5 border-t border-ws-hairline mt-1">
            <div className={`font-display text-[11px] font-semibold ${uc} tracking-[0.08em] text-ws-light mb-1`}>{t('replanning.rerouteSearch')}</div>
            {rejectedRoutes.length === 0 ? (
              <div className="font-ws text-xs text-ws-light">{t('replanning.noBypassCandidates')}</div>
            ) : (
              <div className="space-y-1">
                {rejectedRoutes.map((r) => (
                  <div key={r.path} className="text-[11px] leading-relaxed">
                    <span className="font-mono text-ws-body">{r.path}</span>
                    <span className="block font-ws text-ws-critical">{r.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="font-ws text-[11px] text-ws-mid leading-relaxed mt-2 pt-2 border-t border-ws-hairline">
              {t('replanning.holdLine', {
                attempted: m.hold_attempted ? t('common.yes') : t('common.no'),
                selected: m.hold_selected ? t('common.yes') : t('common.no'),
                limit: m.hold_limit_minutes,
              })}
            </p>
          </div>
        </div>

        {/* after */}
        <div className="bg-ws-dossier px-3.5 md:px-4 xl:px-5 py-3.5">
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className={`font-display text-sm font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.step3')}</span>
            <Pill tone={isReplanned ? 'warn' : 'idle'}>{isReplanned ? t('status.active') : t('status.preview')}</Pill>
          </div>
          <div className="text-[12px] text-ws-mid pb-1.5">{t('replanning.step3Scope', { action: m.action_taken })}</div>
          <FieldRow label={t('common.task')} value={m.affected_task_id} />
          <FieldRow label={t('common.date')} value={after.date} tone="text-ws-warn font-bold" />
          <FieldRow label={t('common.window')} value={win(after)} tone="text-ws-warn font-bold" />
          <FieldRow label={t('common.blocks')} value={(after.block_ids || []).join(' + ')} />
          <FieldRow label={t('common.crew')} value={(m.selected_crew || after.assigned_teams || []).join(', ') || '—'} />
          <p className="font-ws text-xs text-ws-mid leading-relaxed pt-2">
            {t('replanning.step3Note', { runtime: m.replan_runtime_seconds })}
          </p>
        </div>
      </div>

      {/* 01b — the reroute search, on the section graph it ran against */}
      {rejectedRoutes.length > 0 && (
        <div className="bg-ws-surface border-t border-ws-rule px-3.5 md:px-4 xl:px-5 pt-4 pb-4">
          <RegionHeader
            title={t('reroute.title')}
            meta={t('reroute.meta', { count: rejectedRoutes.length, train: (m.affected_trains || [])[0] || ev.train_id || '' })}
          />
          <RerouteDiagram routes={rejectedRoutes} possessionSection={ev.section_id} />
        </div>
      )}

      {/* 02 — audit record + 03 — plan retention */}
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] xl:grid-cols-[64fr_36fr] bg-ws-rule gap-px border-t border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4 min-w-0">
          <div className="flex items-center gap-2.5 pb-2 flex-wrap">
            <span className="font-mono text-[11px] font-bold text-ws-light">02</span>
            <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.auditRecord')}</span>
            <span className="flex-1 min-w-6 h-px bg-ws-rule" />
            <span className="text-[12px] text-ws-mid">{t('replanning.auditScope')}</span>
          </div>
          <div className="border-t border-ws-rule">
            <FieldRow label={t('replanning.actionTaken')} value={m.action_taken} />
            <FieldRow label={t('replanning.reroutingAttempted')} value={m.rerouting_attempted ? t('common.yes') : t('common.no')} />
            <FieldRow
              label={t('replanning.routesInspected')}
              value={`${m.rerouting_candidates_inspected} (${t('replanning.routesRejected', { count: rejectedRoutes.length })})`}
            />
            <FieldRow
              label={t('replanning.reroutingSucceeded')}
              value={m.rerouting_succeeded ? t('common.yes') : t('common.no')}
              tone={m.rerouting_succeeded ? 'text-ws-ok font-bold' : 'text-ws-critical font-bold'}
            />
            <FieldRow
              label={t('replanning.holdSelected')}
              value={`${m.hold_selected ? t('common.yes') : t('common.no')} (${t('replanning.holdLimitSub', { limit: m.hold_limit_minutes })})`}
            />
            <FieldRow label={t('replanning.replanRuntime')} value={`${m.replan_runtime_seconds} s`} />
            <FieldRow
              label={t('replanning.baselineUntouched')}
              value={m.baseline_plan_untouched ? t('common.yes') : t('common.no')}
              tone="text-ws-ok font-bold"
            />
            <FieldRow
              label={t('overview.postSolveValidation')}
              value={baselineMetrics?.provenance?.post_solve_validation || t('header.notRecorded')}
              tone="text-ws-ok font-bold"
            />
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4 min-w-0 space-y-3.5">
          <div>
            <div className="flex items-center gap-2.5 pb-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold text-ws-light">03</span>
              <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('replanning.retention')}</span>
              <span className="flex-1 min-w-6 h-px bg-ws-rule" />
              <span className="text-[12px] text-ws-mid">{t('replanning.retentionScope', { count: retention.tasks_in_plan ?? '—' })}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3.5 gap-y-2 border-t border-ws-rule pt-3">
              <div>
                <div className="font-mono text-[22px] font-bold text-ws-warn leading-none">{retention.tasks_re_solved ?? '—'}</div>
                <div className="font-ws text-xs text-ws-mid mt-[3px] leading-[1.35]">{t('replanning.reSolved')}</div>
              </div>
              <div>
                <div className="font-mono text-[22px] font-bold text-ws-ok leading-none">{retention.tasks_unchanged ?? '—'}</div>
                <div className="font-ws text-xs text-ws-mid mt-[3px] leading-[1.35]">{t('replanning.unchanged')}</div>
              </div>
              <div>
                <div className="font-mono text-[22px] font-bold text-ws-ink leading-none">{retention.retention_percent ?? '—'}%</div>
                <div className="font-ws text-xs text-ws-mid mt-[3px] leading-[1.35]">
                  {t('replanning.retentionPct')} · {t('replanning.retentionBasis', { basis: retention.basis || '—' })}
                </div>
              </div>
            </div>
          </div>

          {retention.caveat && (
            <AdvisoryNote tone="idle" title={t('replanning.retentionCaveatTitle')}>
              {retention.caveat}
            </AdvisoryNote>
          )}

          <AdvisoryNote tone="info" title={t('replanning.deterministicTitle')}>
            {t('replanning.deterministicBody')}{' '}
            <button onClick={() => onNavigate && onNavigate('live-ops')} className="font-display font-bold underline underline-offset-2 hover:text-ws-ink">
              {t('replanning.viewLiveOps')}
            </button>
          </AdvisoryNote>
        </div>
      </div>

      {/* footer */}
      <div className="bg-ws-band border-t border-ws-rule px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="text-[12px] text-ws-mid">
          {t('replanning.artifactsScope', { dir: m.replan_artifacts_directory })}
        </span>
        <span className="flex-1 min-w-2" />
        <span className="text-[12px] text-ws-mid break-all">{t('replanning.baselineNote')}</span>
      </div>
    </div>
  );
};
