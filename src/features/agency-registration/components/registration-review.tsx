import { contactPhone } from "../lib/phone";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useFormContext, useWatch } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { countries } from "../data/countries";
import { registrationDocuments } from "../data/documents";
import { businessTypeDefinition, requiredDocumentsFor } from "../data/business-types";
import { cityLabel } from "../data/locations";
import { useRegistrationStepGuard } from "../hooks/use-registration-step-guard";
import type { RegistrationResult } from "../lib/registration-api";
import type { RegistrationValues } from "../schemas/registration.schema";
import { CompanyLogoPreview } from "./company-logo-preview";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { ApiRegistrationSubmit } from "./api-registration-submit";
import { RegistrationSuccess } from "./registration-success";

function InformationCard({
  title,
  icon,
  editTo,
  rows,
  children,
  wide = false,
}: {
  title: string;
  icon: IconName;
  editTo: string;
  rows: { label: string; value: string; ltr?: boolean }[];
  children?: ReactNode;
  wide?: boolean;
}) {
  const { t } = useLocale();
  return (
    <section className={`review-card${wide ? " review-card--wide" : ""}`}>
      <div className="review-card__head">
        <h3>
          <span className="icon-badge">
            <Icon name={icon} />
          </span>
          {t(title)}
        </h3>
        <Link className="review-card__edit" to={editTo} aria-label={t(`Edit ${title}`)}>
          <Icon name="pencil" />{t("Edit")}
        </Link>
      </div>
      {children}
      <dl>
        {rows.map(({ label, value, ltr }) => (
          <div className="review-row" key={label}>
            <dt>{t(label)}</dt>
            <dd>{ltr ? <bdi>{value}</bdi> : value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RegistrationReview() {
  const { t, locale } = useLocale();
  const canAccess = useRegistrationStepGuard(4);
  const [previewed, setPreviewed] = useState(false);
  // Kept here so a confirmed result survives rerenders of the form below it.
  const [submitted, setSubmitted] = useState<RegistrationResult | null>(null);
  const { control, trigger } = useFormContext<RegistrationValues>();
  const [company, contact, documents] = useWatch({
    control,
    name: ["company", "contact", "documents"],
  });

  if (submitted) {
    return (
      <>
        <RegistrationProgress currentStep={5} />
        <RegistrationSuccess result={submitted} />
      </>
    );
  }
  if (!canAccess)
    return <p role="status">{t("Returning to the first incomplete step…")}</p>;

  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const countryLabel = (code: string) => (locale === "ar" ? regionNames.of(code) : countries.find((country) => country.value === code)?.label) ?? code;
  const businessType = businessTypeDefinition(documents.businessType);

  return (
    <>
      <RegistrationProgress currentStep={4} />
      <RegistrationSection
        title="Review & Submit"
        icon="document"
        description="Please make sure all your information is correct before submitting."
        contentClassName="review-grid"
      >
        <InformationCard
          title="Company Information"
          icon="buildingFilled"
          editTo="/register/agency/company"
          wide
          rows={[
            { label: "Company Name", value: company.name },
            { label: "Country", value: countryLabel(company.country) },
            { label: "City", value: cityLabel(company.country, company.city, locale) },
            { label: "Commercial Registration Number", value: company.registrationNumber, ltr: true },
            { label: "Address", value: company.address },
            { label: "Number of Employees", value: company.employeeCount, ltr: true },
          ]}
        >
          {company.logo && (
            <div className="review-logo">
              <span className="company-logo__frame">
                <CompanyLogoPreview file={company.logo} alt={t(`${company.name} logo`, `شعار ${company.name}`)} />
              </span>
              <div>
                <span>{t("Company Logo")}</span>
                <strong><Icon name="check" />{t("Provided")}</strong>
                <small><bdi>{company.logo.name}</bdi></small>
              </div>
            </div>
          )}
        </InformationCard>
        <InformationCard
          title="Contact Information"
          icon="personFilled"
          editTo="/register/agency/contact"
          rows={[
            { label: "Full Name", value: contact.fullName },
            { label: "Nationality", value: countryLabel(contact.nationality) },
            { label: "ID Number", value: contact.idNumber, ltr: true },
            { label: "ID Document", value: contact.idDocument?.name ?? "", ltr: true },
            { label: "Phone Number", value: contactPhone(contact)?.number ?? `${contact.callingCode} ${contact.phone}`, ltr: true },
            { label: "Email", value: contact.email, ltr: true },
          ]}
        />
        <section className="review-card">
          <div className="review-card__head">
            <h3>
              <span className="icon-badge">
                <Icon name="document" />
              </span>
              {t("Documents")}
            </h3>
            <Link className="review-card__edit" to="/register/agency/documents" aria-label={t("Edit Documents")}>
              <Icon name="pencil" />{t("Edit")}
            </Link>
          </div>
          <dl>
            <div className="review-row">
              <dt>{t("Company Business Type")}</dt>
              <dd>{businessType?.label[locale] ?? ""}</dd>
            </div>
          </dl>
          <ul className="review-documents">
            {registrationDocuments.filter(({ name }) => requiredDocumentsFor(documents.businessType).includes(name)).map(({ name, label }) => (
              <li key={name}>
                <span className="icon-badge">
                  <Icon name="document" />
                </span>
                <div>
                  <span>{t(label)}</span>
                  <strong><bdi>{documents[name]?.name}</bdi></strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </RegistrationSection>
      {apiAuthEnabled ? <ApiRegistrationSubmit onSubmitted={setSubmitted} /> : <>
      <div className="registration-actions">
        <Link
          to="/register/agency/documents"
          className={buttonClass("outline")}
        >
          <Icon name="back" />{t("Back")}
        </Link>
        <Button
          disabled
          aria-describedby="submission-unavailable"
          className="submission-disabled"
        >
          {t("Submit")}
        </Button>
      </div>
      <div className="registration-actions">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (await trigger()) setPreviewed(true);
          }}
        >
          {t("Preview demo submission")}
        </Button>
      </div>
      {previewed && (
        <div role="status" className="availability-notice">
          <strong>{t("Demonstration received — preview only.")}</strong>
          <p>
            {t("No account was created and no information or documents were sent. Actual partner approval is not connected.")}
          </p>
          <Link to="/login">{t("Return to Sign In")}</Link>
        </div>
      )}
      <p
        id="submission-unavailable"
        className="availability-notice submission-notice"
      >
        {t("Submission is not available yet. Your information and documents have not been sent. This draft is kept only while you remain in this registration flow and will be cleared if you refresh.")}
      </p>
      </>}
    </>
  );
}
