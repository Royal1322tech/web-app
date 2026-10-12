import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import type { RegistrationValues } from "../schemas/registration.schema";

export function ContactPhoneField() {
  const {
    register,
    trigger,
    formState: { errors },
  } = useFormContext<RegistrationValues>();
  const phoneError = errors.contact?.phone?.message;
  const codeError = errors.contact?.callingCode?.message;
  return (
    <FormField
      id="contact-phone"
      label="Phone Number"
      required
      error={phoneError}
    >
      <div className="contact-phone" dir="ltr">
        <Icon name="phone" />
        <label className="sr-only" htmlFor="contact-callingCode">
          Country calling code
        </label>
        <input
          id="contact-callingCode"
          className="input calling-code"
          type="tel"
          list="calling-code-options"
          autoComplete="tel-country-code"
          required
          aria-invalid={!!codeError}
          aria-describedby={codeError ? "contact-callingCode-error" : undefined}
          {...register("contact.callingCode", {
            onChange: () => {
              if (codeError) void trigger("contact.callingCode");
            },
          })}
        />
        <datalist id="calling-code-options">
          <option value="+20">Egypt</option>
        </datalist>
        <input
          id="contact-phone"
          className="input"
          type="tel"
          autoComplete="tel-national"
          placeholder="Enter phone number"
          required
          aria-invalid={!!phoneError}
          aria-describedby={phoneError ? "contact-phone-error" : undefined}
          {...register("contact.phone")}
        />
      </div>
      {codeError && (
        <p id="contact-callingCode-error" className="field-error" role="alert">
          {codeError}
        </p>
      )}
    </FormField>
  );
}
