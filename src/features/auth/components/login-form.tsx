import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { loginSchema, type LoginValues } from "../schemas/login.schema";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  return (
    <form
      className="login-form"
      noValidate
      onSubmit={handleSubmit(
        () =>
          setNotice(
            "Sign-in is not available yet. Your credentials have not been sent.",
          ),
        () => setNotice(""),
      )}
    >
      <FormField
        id="username"
        label="User Name"
        error={errors.username?.message}
      >
        <Input
          id="username"
          autoComplete="username"
          placeholder="Enter your username"
          required
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? "username-error" : undefined}
          {...register("username")}
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
          endAdornment={
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          }
        />
      </FormField>
      <Link to="/forgot-password" className="text-button">
        Forgot My Password?
      </Link>
      <Button type="submit" disabled={isSubmitting}>
        Sign In
      </Button>
      <div role="status" aria-live="polite">
        {notice && <p className="availability-notice">{notice}</p>}
      </div>
    </form>
  );
}
