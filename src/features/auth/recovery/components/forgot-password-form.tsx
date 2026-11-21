import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonClass } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useRecoveryText } from "../messages";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "../schemas/recovery.schema";
import { RecoveryShell } from "./recovery-shell";
import styles from "../recovery.module.css";
export function ForgotPasswordForm() {
  const { text } = useRecoveryText();
  const [pending, setPending] = useState(false);
  const [help, setHelp] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { username: "", email: "" },
  });
  return (
    <RecoveryShell
      title="Forgot Your Password?"
      backHref="/login"
      backLabel="Back to sign in"
    >
      <form
        noValidate
        className={styles.form}
        onSubmit={handleSubmit(
          () => setPending(true),
          () => setPending(false),
        )}
      >
        <FormField
          id="recovery-username"
          label={text("User Name")}
          error={errors.username?.message && text(errors.username.message)}
        >
          <Input
            id="recovery-username"
            required
            autoComplete="username"
            aria-invalid={!!errors.username}
            aria-describedby={
              errors.username ? "recovery-username-error" : undefined
            }
            {...register("username")}
          />
        </FormField>
        <FormField
          id="recovery-email"
          label={text("E-mail")}
          error={errors.email?.message && text(errors.email.message)}
        >
          <Input
            id="recovery-email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "recovery-email-error" : undefined}
            {...register("email")}
          />
        </FormField>
        <a
          href="#recovery-help"
          className={styles.help}
          aria-expanded={help}
          onClick={(event) => {
            event.preventDefault();
            setHelp(!help);
          }}
        >
          {text("I forgot my email or user name?")}
        </a>
        {help && (
          <p id="recovery-help" className={styles.notice}>
            {text(
              "Online account recovery isn't available yet. Please contact your account support channel.",
            )}
          </p>
        )}
        <Button type="submit">{text("Send")}</Button>
        <Link to="/login" className={buttonClass("outline")}>
          {text("Cancel")}
        </Link>
        <p role="status" className={styles.notice}>
          {pending
            ? text(
                "Online password recovery isn't available yet. No email has been sent.",
              )
            : text("Recovery service unavailable")}
        </p>
        {pending && (
          <Link to="/verify-otp" className="button button--outline">
            {text("Continue to verification")}
          </Link>
        )}
      </form>
    </RecoveryShell>
  );
}
