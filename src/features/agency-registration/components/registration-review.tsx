import { useState } from "react";
import { Link } from "react-router-dom";
import { useFormContext, useWatch } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { countries } from "../data/countries";
import { registrationDocuments } from "../data/documents";
import { useRegistrationStepGuard } from "../hooks/use-registration-step-guard";
import type { RegistrationValues } from "../schemas/registration.schema";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";

function countryLabel(code: string) {
  return countries.find((country) => country.value === code)?.label ?? code;
}

function InformationCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: IconName;
  rows: { label: string; value: string }[];
}) {
  return (
    <section className="review-card">
      <h3>
        <span className="icon-badge">
          <Icon name={icon} />
        </span>
        {title}
      </h3>
      <dl>
        {rows.map(({ label, value }) => (
          <div className="review-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RegistrationReview() {
  const canAccess = useRegistrationStepGuard(4);
  const [previewed, setPreviewed] = useState(false);
  const { control, trigger } = useFormContext<RegistrationValues>();
  const [company, contact, documents] = useWatch({
    control,
    name: ["company", "contact", "documents"],
  });

  if (!canAccess)
    return <p role="status">Returning to the first incomplete step…</p>;

  return (
    <>
      <RegistrationProgress currentStep={4} />
      <RegistrationSection
        title="Review & Submit"
        description="Please make sure all your information is correct before submitting."
        contentClassName="review-grid"
      >
        <InformationCard
          title="Company Information"
          icon="buildingFilled"
          rows={[
            { label: "Company Name", value: company.name },
            { label: "Country", value: countryLabel(company.country) },
            { label: "Registration Number", value: company.registrationNumber },
            { label: "Address", value: company.address },
            { label: "Number of Employees", value: company.employeeCount },
          ]}
        />
        <InformationCard
          title="Contact Information"
          icon="personFilled"
          rows={[
            { label: "Role", value: contact.role },
            { label: "Full Name", value: contact.fullName },
            { label: "Nationality", value: countryLabel(contact.nationality) },
            { label: "ID Number", value: contact.idNumber },
            {
              label: "Phone Number",
              value: contact.phone.trim().startsWith("+")
                ? contact.phone
                : `${contact.callingCode} ${contact.phone}`,
            },
            { label: "Email", value: contact.email },
          ]}
        />
        <section className="review-card">
          <h3>
            <span className="icon-badge">
              <Icon name="document" />
            </span>
            Documents
          </h3>
          <ul className="review-documents">
            {registrationDocuments.map(({ name, label }) => (
              <li key={name}>
                <span className="icon-badge">
                  <Icon name="document" />
                </span>
                <div>
                  <span>{label}</span>
                  <strong>{documents[name]?.name}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </RegistrationSection>
      <div className="registration-actions">
        <Link
          to="/register/agency/documents"
          className={buttonClass("outline")}
        >
          Back
        </Link>
        <Button
          disabled
          aria-describedby="submission-unavailable"
          className="submission-disabled"
        >
          Submit
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
          Preview demo submission
        </Button>
      </div>
      {previewed && (
        <div role="status" className="availability-notice">
          <strong>Demonstration received — preview only.</strong>
          <p>
            No account was created and no information or documents were sent.
            Actual partner approval is not connected.
          </p>
          <Link to="/login">Return to Sign In</Link>
        </div>
      )}
      <p
        id="submission-unavailable"
        className="availability-notice submission-notice"
      >
        Submission is not available yet. Your information and documents have not
        been sent. This draft is kept only while you remain in this registration
        flow and will be cleared if you refresh.
      </p>
    </>
  );
}
