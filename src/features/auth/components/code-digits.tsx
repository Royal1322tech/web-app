import { forwardRef, useImperativeHandle, useRef } from "react";
import { useLocale } from "@/features/localization/locale-provider";

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (char) => String(char.charCodeAt(0) - (char.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660))).replace(/\D/g, "");
}

export interface CodeDigitsHandle {
  focus: () => void;
}

/**
 * Separate digit boxes in the style of the original verification screen. It only collects the
 * code; verification always happens on the server. Paste, Arabic digits, Backspace and arrow keys work.
 */
export const CodeDigits = forwardRef<CodeDigitsHandle, {
  id: string;
  length?: number;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}>(function CodeDigits({ id, length = 6, value, onChange, invalid = false, disabled = false, describedBy }, ref) {
  const { t, locale } = useLocale();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");
  useImperativeHandle(ref, () => ({ focus: () => inputs.current[value.length >= length ? 0 : value.length]?.focus() }), [value.length, length]);

  function enter(raw: string, index: number) {
    const typed = normalizeDigits(raw);
    const next = [...digits];
    if (!typed) next[index] = "";
    else for (let offset = 0; offset < typed.length && index + offset < length; offset++) next[index + offset] = typed[offset];
    onChange(next.join("").slice(0, length));
    if (typed) inputs.current[Math.min(index + typed.length, length - 1)]?.focus();
  }

  return (
    <fieldset className="login-otp__group" disabled={disabled}>
      <legend className="sr-only">{t("Verification code", "رمز التحقق")}</legend>
      <div className="login-otp__digits" dir="ltr">
        {digits.map((digit, index) => (
          <input
            key={index}
            id={index === 0 ? id : undefined}
            ref={(node) => { inputs.current[index] = node; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            aria-label={locale === "ar" ? `الرقم ${index + 1} من ${length}` : `Digit ${index + 1} of ${length}`}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => enter(event.target.value, index)}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = normalizeDigits(event.clipboardData.getData("text").trim());
              enter(pasted, pasted.length === length ? 0 : index);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace") {
                event.preventDefault();
                const target = digit ? index : Math.max(0, index - 1);
                onChange(digits.map((item, position) => (position === target ? "" : item)).join(""));
                inputs.current[target]?.focus();
              } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                inputs.current[Math.max(0, Math.min(length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)))]?.focus();
              }
            }}
          />
        ))}
      </div>
    </fieldset>
  );
});
