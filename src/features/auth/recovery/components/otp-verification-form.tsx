import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRecoveryText } from "../messages";
import { otpSchema } from "../schemas/recovery.schema";
import { RecoveryShell } from "./recovery-shell";
import styles from "../recovery.module.css";
function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (char) =>
    String(char.charCodeAt(0) - (char.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660)),
  );
}
export function OtpVerificationForm() {
  const { locale, text } = useRecoveryText();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  function enter(raw: string, index: number) {
    const value = normalizeDigits(raw);
    setPending(false);
    if (!/^\d*$/.test(value)) {
      setError("Use digits only.");
      return;
    }
    if (value.length > 4) {
      setError("Enter all four digits.");
      return;
    }
    setError("");
    setDigits((current) => {
      const next = [...current];
      if (!value) next[index] = "";
      else
        for (let i = 0; i < value.length && index + i < 4; i++)
          next[index + i] = value[i];
      return next;
    });
    if (value) inputs.current[Math.min(index + value.length, 3)]?.focus();
  }
  return (
    <RecoveryShell
      title="Enter the 4-digit verification code"
      backHref="/forgot-password"
      backLabel="Back to password recovery"
    >
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setPending(false);
          const result = otpSchema.safeParse(digits.join(""));
          if (!result.success) {
            setError(result.error.issues[0].message);
            inputs.current[
              Math.max(
                0,
                digits.findIndex((digit) => !digit),
              )
            ]?.focus();
            return;
          }
          setError("");
          setPending(true);
        }}
      >
        <p className={styles.notice}>
          {text(
            "Use the four-digit code from your recovery email when verification becomes available.",
          )}
        </p>
        <fieldset
          className={styles.otpGroup}
          aria-describedby={error ? "otp-error" : undefined}
        >
          <legend className="sr-only">{text("Verification code")}</legend>
          <div className={styles.digits} dir="ltr">
            {digits.map((value, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={4}
                value={value}
                aria-label={
                  locale === "ar"
                    ? `الرقم ${index + 1} من ٤`
                    : `Digit ${index + 1} of 4`
                }
                aria-invalid={!!error}
                aria-describedby={error ? "otp-error" : undefined}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => enter(event.target.value, index)}
                onPaste={(event) => {
                  event.preventDefault();
                  const pasted = normalizeDigits(
                    event.clipboardData.getData("text").trim(),
                  );
                  enter(pasted, pasted.length === 4 ? 0 : index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace") {
                    event.preventDefault();
                    const target = value ? index : Math.max(0, index - 1);
                    setDigits((current) =>
                      current.map((digit, i) => (i === target ? "" : digit)),
                    );
                    setError("");
                    setPending(false);
                    inputs.current[target]?.focus();
                  } else if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight"
                  ) {
                    event.preventDefault();
                    inputs.current[
                      Math.max(
                        0,
                        Math.min(
                          3,
                          index + (event.key === "ArrowLeft" ? -1 : 1),
                        ),
                      )
                    ]?.focus();
                  }
                }}
              />
            ))}
          </div>
        </fieldset>
        {error && (
          <p id="otp-error" className="field-error" role="alert">
            {text(error)}
          </p>
        )}
        <Button type="submit">{text("Confirm")}</Button>
        <p role="status" className={styles.notice}>
          {text(
            pending
              ? "Online verification isn't available yet. No code has been sent or checked."
              : "Recovery service unavailable",
          )}
        </p>
        {pending && (
          <Link to="/reset-password" className="button button--outline">
            {text("Continue to reset")}
          </Link>
        )}
      </form>
    </RecoveryShell>
  );
}
