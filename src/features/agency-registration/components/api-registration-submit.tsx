import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { ApiStatusNotice } from "@/features/auth/components/api-status-notice";
import { useLocale } from "@/features/localization/locale-provider";
import { passwordRules, submitRegistration, type RegistrationResult } from "../lib/registration-api";
import type { RegistrationValues } from "../schemas/registration.schema";

const fieldLabels: Record<string, { label: string; step: string }> = {
  contact_email: { label: "Email", step: "/register/agency/contact" },
  registration_no: { label: "Commercial Registration Number", step: "/register/agency/company" },
  contact_phone: { label: "Phone Number", step: "/register/agency/contact" },
  country_code: { label: "Country", step: "/register/agency/company" },
  city: { label: "City", step: "/register/agency/company" },
};

/** Real submission to the registration API. Success is reported to the parent only after the API confirms it. */
export function ApiRegistrationSubmit({ onSubmitted }: { onSubmitted: (result: RegistrationResult) => void }) {
  const { t, locale } = useLocale();
  const { trigger, getValues } = useFormContext<RegistrationValues>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [failure, setFailure] = useState<{ message: string; fields: { label: string; step: string; message: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A ref, not state, so a second click in the same frame can't send a second registration.
    if (pending.current) return;
    const next: typeof errors = {};
    if (!passwordRules.every((rule) => rule.test(password))) next.password = t("Use a password that meets every rule below.");
    if (confirmation !== password) next.confirmation = t("The passwords don't match.");
    setErrors(next);
    setFailure(null);
    if (next.password) return passwordRef.current?.focus();
    if (next.confirmation) return confirmationRef.current?.focus();
    pending.current = true;
    setBusy(true);
    try {
      if (!(await trigger())) {
        setFailure({ message: t("Some details are incomplete. Go back and check each step."), fields: [] });
        return;
      }
      const result = await submitRegistration(getValues(), password);
      setPassword("");
      setConfirmation("");
      onSubmitted(result);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "validation") {
        const fields = Object.entries(error.fieldErrors).map(([field, messages]) => {
          const known = fieldLabels[field];
          const duplicate = /already/i.test(messages[0] ?? "");
          return {
            label: known ? t(known.label) : field.replace(/_/g, " "),
            step: known?.step ?? "/register/agency/company",
            message: duplicate ? t("is already registered.") : t("needs to be checked."),
          };
        });
        setFailure({ message: t("The registration wasn't accepted. Please correct the following:"), fields });
      } else if (error instanceof ApiError && error.kind === "rate_limited") {
        setFailure({ message: t("Too many registration attempts from this network. Please try again later."), fields: [] });
      } else if (error instanceof ApiError && (error.kind === "network" || error.kind === "timeout")) {
        setFailure({ message: t("We couldn't reach the registration service. Check your connection and try again."), fields: [] });
      } else {
        setFailure({ message: t("The registration service returned an unexpected response. Please try again later."), fields: [] });
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const toggle = (
    <button type="button" className="password-toggle" aria-label={visible ? t("Hide password") : t("Show password")} aria-pressed={visible} onClick={() => setVisible(!visible)}>
      <Icon name={visible ? "eyeOff" : "eye"} />
    </button>
  );

  return (
    <form className="registration-password" noValidate onSubmit={submit} aria-labelledby="registration-password-title" aria-busy={busy}>
      <div className="registration-password__head">
        <span className="icon-badge"><Icon name="id" /></span>
        <div>
          <h2 id="registration-password-title">{t("Create your password")}</h2>
          <p>{t("You'll use it with your email and company ID to sign in.")}</p>
        </div>
      </div>
      <ApiStatusNotice service="registration" />
      <p className="availability-notice registration-password__files">
        <Icon name="info" />
        <span>{t("Your company logo, ID document and company documents are not uploaded yet. Royal Vacation will ask for them during approval.")}</span>
      </p>
      <div className="registration-password__fields">
        <FormField id="registration-password" label={t("Password")} required error={errors.password}>
          <Input id="registration-password" ref={passwordRef} type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} aria-describedby={["registration-password-rules", errors.password ? "registration-password-error" : ""].filter(Boolean).join(" ")} endAdornment={toggle} />
        </FormField>
        <FormField id="registration-password-confirmation" label={t("Confirm password")} required error={errors.confirmation}>
          <Input id="registration-password-confirmation" ref={confirmationRef} type={visible ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-invalid={!!errors.confirmation} aria-describedby={errors.confirmation ? "registration-password-confirmation-error" : undefined} />
        </FormField>
      </div>
      <ul id="registration-password-rules" className="registration-password__rules" aria-label={t("Password requirements")}>
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.en} data-met={met}>
              <Icon name={met ? "check" : "close"} />
              <span>{locale === "ar" ? rule.ar : rule.en}</span>
              <span className="sr-only">{met ? t("(met)") : t("(not met)")}</span>
            </li>
          );
        })}
      </ul>
      {failure && (
        <div role="alert" className="availability-notice registration-password__failure">
          <p>{failure.message}</p>
          {failure.fields.length > 0 && <ul>{failure.fields.map((field) => <li key={field.label}><Link to={field.step}>{field.label}</Link> {field.message}</li>)}</ul>}
        </div>
      )}
      <div className="registration-actions">
        <Link to="/register/agency/documents" className="button button--outline"><Icon name="back" />{t("Back")}</Link>
        <Button type="submit" disabled={busy}>{busy ? t("Submitting…") : t("Submit registration")}</Button>
      </div>
    </form>
  );
}
