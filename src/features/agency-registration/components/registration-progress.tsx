import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";

const steps = [
  "Company Information",
  "Contact Information",
  "Upload Documents",
  "Review & Submit",
];

/** `currentStep` 5 marks every step complete, after a confirmed submission. */
export function RegistrationProgress({
  currentStep,
}: {
  currentStep: 1 | 2 | 3 | 4 | 5;
}) {
  const { t } = useLocale();
  const current = currentStep <= 4 ? currentStep : null;
  return (
    <>
    <ol className="registration-progress" aria-label={t("Registration progress")}>
      {steps.map((label, index) => {
        const done = index + 1 < currentStep;
        return (
          <li
            key={label}
            className={index < currentStep ? "step step--active" : "step"}
            data-state={done ? "done" : index + 1 === currentStep ? "current" : "upcoming"}
            aria-current={index + 1 === currentStep ? "step" : undefined}
          >
            <div className="step-track">
              <span className="step-number" aria-hidden="true">
                {done ? <Icon name="check" /> : `0${index + 1}`}
              </span>
              <span className="step-line" />
            </div>
            <span className="step-label">{t(label)}</span>
            {done && <span className="sr-only"> {t("(completed)")}</span>}
          </li>
        );
      })}
    </ol>
    {/* Phones show one caption instead of a label under each step; the list above stays the accessible version. */}
    {current && (
      <p className="registration-progress__caption" aria-hidden="true">
        <span>{t(`Step ${current} of 4`, `الخطوة ${current} من 4`)}</span>
        <strong>{t(steps[current - 1])}</strong>
      </p>
    )}
    </>
  );
}
