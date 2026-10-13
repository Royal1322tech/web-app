import { BrandLogo } from "@/components/brand-logo";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell variant="login">
      <div className="login-content">
        <BrandLogo variant="auth" />
        <h1>Sign In</h1>
        <p className="intro-copy">Welcome back to your account.</p>
        <LoginForm />
      </div>
    </AuthShell>
  );
}
