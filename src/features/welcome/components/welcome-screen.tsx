import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { AuthShell } from "@/components/layout/auth-shell";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function WelcomeScreen() {
  return (
    <AuthShell variant="welcome">
      <div className="welcome-content">
        <BrandLogo />
        <h1>Welcome!</h1>
        <p className="intro-copy">
          Please select your account type to continue
        </p>
        <div className="account-options">
          <section className="account-card">
            <span className="icon-badge">
              <Icon name="building" />
            </span>
            <h2>Existing Partner</h2>
            <p>Sign in with your user name and password</p>
            <Link to="/login" className={buttonClass()}>
              Sign In
            </Link>
          </section>
          <section className="account-card">
            <span className="icon-badge">
              <Icon name="user" />
            </span>
            <h2>New Travel Agency</h2>
            <p>Register your company and become a partner</p>
            <Link to="/register/agency" className={buttonClass("outline")}>
              Register
            </Link>
          </section>
        </div>
      </div>
    </AuthShell>
  );
}
