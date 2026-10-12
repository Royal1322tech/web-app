const steps = [
  "Company Information",
  "Contact Information",
  "Upload Documents",
  "Review & Submit",
];

export function RegistrationProgress({
  currentStep,
}: {
  currentStep: 1 | 2 | 3 | 4;
}) {
  return (
    <ol className="registration-progress" aria-label="Registration progress">
      {steps.map((label, index) => (
        <li
          key={label}
          className={index < currentStep ? "step step--active" : "step"}
          aria-current={index + 1 === currentStep ? "step" : undefined}
        >
          <div className="step-track">
            <span className="step-number" aria-hidden="true">
              {`0${index + 1}`}
            </span>
            <span className="step-line" />
          </div>
          <span>{label}</span>
          {index + 1 < currentStep && (
            <span className="sr-only"> (completed)</span>
          )}
        </li>
      ))}
    </ol>
  );
}
