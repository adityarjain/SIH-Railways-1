import React from 'react';
import { useDemoGuide, DEMO_STEPS } from '../../context/DemoGuideContext';
import { ChevronLeft, ChevronRight, X, Info } from 'lucide-react';

export const DemoGuideBar = ({ onNavigate }) => {
  const { isGuideActive, toggleGuide, currentStepIndex, currentStep, setStep, totalSteps } = useDemoGuide();

  if (!isGuideActive) return null;

  // Navigate to the step being moved TO. Reading `currentStep` after calling
  // nextStep() sees the pre-update value, which left every step showing the
  // previous step's page and skipped the role handoff on step 14.
  const goToStep = (index) => {
    const target = DEMO_STEPS[index];
    if (!target) return;
    setStep(index);
    if (onNavigate) {
      onNavigate(target.page, target.role);
    }
  };

  const handleNext = () => goToStep(currentStepIndex + 1);
  const handlePrev = () => goToStep(currentStepIndex - 1);

  return (
    <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md sticky top-14 z-25">
      <div className="flex items-center gap-3 max-w-4xl">
        <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded tracking-wide font-mono">
          STEP {currentStepIndex + 1} / {totalSteps}
        </span>
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>{currentStep.title}</span>
            <span className="text-[11px] font-normal text-slate-400">({currentStep.role})</span>
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{currentStep.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Previous Step"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
          className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
          title="Next Step"
        >
          <span>Next Step</span>
          <ChevronRight size={14} />
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={toggleGuide}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Exit Guide"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
