import React from 'react';
import { useDemoGuide, DEMO_STEPS } from '../../context/DemoGuideContext';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export const DemoGuideBar = ({ onNavigate }) => {
  const { isGuideActive, toggleGuide, currentStepIndex, currentStep, setStep, totalSteps } = useDemoGuide();
  const { toggleReplan } = usePlan();
  const { t } = useI18n();

  // Land on the current step's page/role rather than showing "Step n/14" over
  // whatever screen happened to be mounted.
  //
  // This navigates to the CURRENT step, never to step 0. The bar is rendered by
  // whichever role shell is active, so switching role unmounts and remounts it
  // — a reset here would send the demo back to step 1 exactly at the Ground
  // handoff. Restarting on open is handled by toggleGuide instead. Re-running
  // this on remount is idempotent: it re-asserts the page we are already on.
  React.useEffect(() => {
    if (!isGuideActive) return;
    const target = DEMO_STEPS[currentStepIndex];
    if (!target) return;
    if (typeof target.replanned === 'boolean') toggleReplan(target.replanned);
    if (onNavigate) onNavigate(target.page, target.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuideActive]);

  if (!isGuideActive) return null;

  // Navigate to the step being moved TO. Reading `currentStep` after calling
  // nextStep() sees the pre-update value, which left every step showing the
  // previous step's page and skipped the role handoff on step 14.
  const goToStep = (index) => {
    const target = DEMO_STEPS[index];
    if (!target) return;
    setStep(index);
    // The replan lands at step 11. Carry that state with the step so the
    // maintenance card at step 14 shows the 08 Sep window the narration
    // describes, and so stepping backwards restores the original schedule.
    if (typeof target.replanned === 'boolean') {
      toggleReplan(target.replanned);
    }
    if (onNavigate) {
      onNavigate(target.page, target.role);
    }
  };

  const handleNext = () => goToStep(currentStepIndex + 1);
  const handlePrev = () => goToStep(currentStepIndex - 1);

  return (
    <div className="bg-rail-800 text-white px-5 py-2 flex items-center justify-between gap-4 border-b border-rail-700 sticky top-0 z-guide">
      <div className="flex items-center gap-3 min-w-0">
        <span className="bg-status-info text-white text-[10px] font-bold px-2 py-0.5 tracking-wide font-mono shrink-0">
          {t('common.step')} {currentStepIndex + 1} / {totalSteps}
        </span>
        <div className="min-w-0">
          <h4 className="text-[11px] font-semibold text-white flex items-center gap-1.5">
            <span className="truncate">{t(currentStep.titleKey)}</span>
            <span className="text-[10px] font-normal text-rail-400 shrink-0">({currentStep.role})</span>
          </h4>
          <p className="text-[10px] text-rail-300 mt-0.5 truncate">{t(currentStep.descKey)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="p-1 bg-rail-900 border border-rail-700 hover:bg-rail-700 disabled:opacity-30 disabled:cursor-not-allowed text-rail-300 transition-colors"
          title={t('common.previous')} aria-label={t('common.previous')}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
          className="flex items-center gap-1 px-2.5 py-1 bg-status-info hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-semibold text-white transition-colors"
          title={t('common.next')} aria-label={t('common.next')}
        >
          <span>{t('common.next')}</span>
          <ChevronRight size={13} />
        </button>
        <button
          onClick={toggleGuide}
          className="p-1 text-rail-400 hover:text-white transition-colors"
          title={t('common.exit')} aria-label={t('common.exit')}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
