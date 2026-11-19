import { SETUP_STEPS, type SetupStepKey } from "../lib/setup-steps";
import { StepDone } from "./step-done";

// Se coloca al final de la página de cada paso de la guía.
export function SetupStepFooter({ step, completed }: { step: SetupStepKey; completed: readonly string[] }) {
  const index = SETUP_STEPS.findIndex((item) => "key" in item && item.key === step);
  return <StepDone step={step} number={index + 1} title={SETUP_STEPS[index].title} done={completed.includes(step)} />;
}
