import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import type { RegistrationResult } from "../lib/registration-api";

/**
 * Shown only after the registration API has confirmed success. Every element is visible without
 * animation; the staged entrance is CSS only and is removed for reduced motion.
 */
export function RegistrationSuccess({ result }: { result: RegistrationResult }) {
  const { t } = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => heading.current?.focus(), []);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(result.companyId);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <section className="registration-success" aria-labelledby="registration-success-title">
      <div className="registration-success__mark" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <circle className="registration-success__ring" cx="32" cy="32" r="29" />
          <path className="registration-success__check" d="M19 33.5 28 42l17-19" />
        </svg>
      </div>
      <div className="registration-success__message" role="status">
        <h2 id="registration-success-title" ref={heading} tabIndex={-1}>{t("Registration Submitted!")}</h2>
        <p>{t("Your registration has been received. Your company is not approved yet: Royal Vacation will review it first.")}</p>
      </div>
      <p className="registration-success__status">
        <Icon name="clock" />
        <span>{result.status === "pending" ? t("Awaiting Approval") : result.status}</span>
      </p>
      <div className="registration-success__id">
        <span id="registration-company-id-label">{t("Company ID")}</span>
        <div className="registration-success__id-row">
          <code aria-labelledby="registration-company-id-label"><bdi>{result.companyId}</bdi></code>
          <button type="button" className="button button--outline" onClick={() => void copyId()}>
            <Icon name={copy === "copied" ? "check" : "copy"} />
            {copy === "copied" ? t("Copied") : t("Copy")}
          </button>
        </div>
        <p className="registration-success__copy-status" role="status">
          {copy === "copied" && t("Company ID copied.")}
          {copy === "failed" && t("Copying isn't available here. Select the ID and copy it.")}
        </p>
        <p className="registration-success__hint">{t("Keep this company ID. You need it, with your email and password, to sign in.")}</p>
      </div>
      <div className="registration-success__cta">
        <Link className="button button--primary" to="/login">{t("Go to Sign In")}<Icon name="arrowRight" /></Link>
        <p>{t("You can sign in once your company is approved.")}</p>
      </div>
    </section>
  );
}
