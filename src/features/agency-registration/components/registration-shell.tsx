import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function RegistrationShell({ children }: { children: ReactNode }) {
  return (
    <main lang="en" dir="ltr" className="registration-page">
      <div className="registration-frame">
        <div className="registration-content">
          <header className="registration-header">
            <BrandLogo withName />
            <h1>New Travel Agency Registration</h1>
            <p>Tell us about your company to become a partner.</p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
