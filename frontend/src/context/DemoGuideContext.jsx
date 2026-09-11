import React, { createContext, useContext, useState } from 'react';
import { ROLES } from './AuthContext';

const DemoGuideContext = createContext();

export const DEMO_STEPS = [
  {
    step: 1,
    replanned: false,
    titleKey: "demo.step1Title",
    page: "overview",
    role: ROLES.AUTHORITY,
    descKey: "demo.step1Desc",
    tipKey: "demo.step1Tip"
  },
  {
    step: 2,
    replanned: false,
    titleKey: "demo.step2Title",
    page: "demand",
    role: ROLES.AUTHORITY,
    descKey: "demo.step2Desc",
    tipKey: "demo.step2Tip"
  },
  {
    step: 3,
    replanned: false,
    titleKey: "demo.step3Title",
    page: "demand",
    role: ROLES.AUTHORITY,
    highlightTask: "TASK-000005",
    descKey: "demo.step3Desc",
    tipKey: "demo.step3Tip"
  },
  {
    step: 4,
    replanned: false,
    titleKey: "demo.step4Title",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    descKey: "demo.step4Desc",
    tipKey: "demo.step4Tip"
  },
  {
    step: 5,
    replanned: false,
    titleKey: "demo.step5Title",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    openDecisionTrace: true,
    descKey: "demo.step5Desc",
    tipKey: "demo.step5Tip"
  },
  {
    step: 6,
    replanned: false,
    titleKey: "demo.step6Title",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    descKey: "demo.step6Desc",
    tipKey: "demo.step6Tip"
  },
  {
    step: 7,
    replanned: false,
    titleKey: "demo.step7Title",
    page: "simulator",
    role: ROLES.AUTHORITY,
    descKey: "demo.step7Desc",
    tipKey: "demo.step7Tip"
  },
  {
    step: 8,
    replanned: false,
    titleKey: "demo.step8Title",
    page: "live-ops",
    role: ROLES.AUTHORITY,
    descKey: "demo.step8Desc",
    tipKey: "demo.step8Tip"
  },
  {
    step: 9,
    replanned: false,
    titleKey: "demo.step9Title",
    page: "live-ops",
    role: ROLES.AUTHORITY,
    descKey: "demo.step9Desc",
    tipKey: "demo.step9Tip"
  },
  {
    step: 10,
    replanned: false,
    titleKey: "demo.step10Title",
    page: "simulator",
    role: ROLES.AUTHORITY,
    descKey: "demo.step10Desc",
    tipKey: "demo.step10Tip"
  },
  {
    step: 11,
    replanned: true,
    titleKey: "demo.step11Title",
    page: "simulator",
    role: ROLES.AUTHORITY,
    descKey: "demo.step11Desc",
    tipKey: "demo.step11Tip"
  },
  {
    step: 12,
    replanned: true,
    titleKey: "demo.step12Title",
    page: "replanning",
    role: ROLES.AUTHORITY,
    descKey: "demo.step12Desc",
    tipKey: "demo.step12Tip"
  },
  {
    step: 13,
    replanned: true,
    titleKey: "demo.step13Title",
    page: "my-tasks",
    role: ROLES.GROUND,
    descKey: "demo.step13Desc",
    tipKey: "demo.step13Tip"
  },
  {
    step: 14,
    replanned: true,
    titleKey: "demo.step14Title",
    page: "general-verify",
    role: ROLES.AUTHORITY,
    descKey: "demo.step14Desc",
    tipKey: "demo.step14Tip"
  }
];

export const DemoGuideProvider = ({ children }) => {
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = DEMO_STEPS[currentStepIndex];

  const nextStep = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const setStep = (index) => {
    if (index >= 0 && index < DEMO_STEPS.length) {
      setCurrentStepIndex(index);
    }
  };

  /**
   * Opening the guide restarts it at step 1. This lives here rather than in an
   * effect inside DemoGuideBar because the bar is rendered by whichever role
   * shell is mounted, so it unmounts and remounts on every role switch — and a
   * mount-keyed reset sent the demo back to step 1 at the Ground handoff.
   */
  const toggleGuide = () => {
    setIsGuideActive((active) => {
      if (!active) setCurrentStepIndex(0);
      return !active;
    });
  };

  return (
    <DemoGuideContext.Provider
      value={{
        isGuideActive,
        toggleGuide,
        setIsGuideActive,
        currentStepIndex,
        currentStep,
        nextStep,
        prevStep,
        setStep,
        totalSteps: DEMO_STEPS.length,
      }}
    >
      {children}
    </DemoGuideContext.Provider>
  );
};

export const useDemoGuide = () => useContext(DemoGuideContext);
