import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useRecoveryText } from "../messages";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "../schemas/recovery.schema";
import { RecoveryShell } from "./recovery-shell";
import styles from "../recovery.module.css";
function PasswordField({
  confirmation = false,
  registration,
  error,
}: {
  confirmation?: boolean;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const { text } = useRecoveryText();
  const [visible, setVisible] = useState(false);
  const id = confirmation ? "confirm-password" : "new-password";
  return (
    <FormField
      id={id}
      label={text(confirmation ? "Confirm Password" : "Password")}
      error={error && text(error)}
    >
      <Input
        id={id}
        required
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : "password-policy"}
        {...registration}
        endAdornment={
          <button
            type="button"
            className="password-toggle"
            aria-pressed={visible}
            aria-label={text(
              confirmation
                ? visible
                  ? "Hide confirmation password"
                  : "Show confirmation password"
                : visible
                  ? "Hide password"
                  : "Show password",
            )}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? "eyeOff" : "eye"} />
          </button>
        }
      />
    </FormField>
  );
}
export function ResetPasswordForm() {
  const { text } = useRecoveryText();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  return (
    <RecoveryShell
      title="Enter Your New Password"
      backHref="/verify-otp"
      backLabel="Back to verification"
    >
      <form
        className={styles.form}
        noValidate
        onSubmit={handleSubmit(
          () => setPending(true),
          () => setPending(false),
        )}
      >
        <PasswordField
          registration={register("password")}
          error={errors.password?.message}
        />
        <PasswordField
          confirmation
          registration={register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        <p id="password-policy" className={styles.notice}>
          {text("Use at least 8 characters.")}
        </p>
        <Button type="submit">{text("Confirm")}</Button>
        <p role="status" className={styles.notice}>
          {text(
            pending
              ? "Password reset is not connected yet. Your password has not been changed."
              : "Recovery service unavailable",
          )}
        </p>
        {pending && (
          <Link to="/login" className="button button--outline">
            {text("Return to sign in")}
          </Link>
        )}
      </form>
    </RecoveryShell>
  );
}
