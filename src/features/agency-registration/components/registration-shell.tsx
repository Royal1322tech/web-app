import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function RegistrationShell({ children }: { children: ReactNode }) {
  return (
    <main lang="en" dir="ltr" className="registration-page">
      <div className="registration-frame">
        <div className="registration-content">
          <header className="registration-header">
            <BrandLogo withName variant="auth" />
            <h1>New Travel Agency Registration</h1>
            <p>Tell us about your company to become a partner.</p>
            <p className="fine-print">Frontend preview only. No agency account is created.</p>
            <nav aria-label="Registration account navigation"><Link to="/login">Sign In</Link>{" · "}<Link to="/welcome">Back to welcome</Link></nav>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
