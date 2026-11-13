import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { RegistrationValues } from "../schemas/registration.schema";
import { CompanyLocationFields } from "./company-location-fields";
import { CompanyLogoField } from "./company-logo-field";
import { RegistrationField } from "./registration-field";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";
import { useLocale } from "@/features/localization/locale-provider";

export function CompanyInformationForm() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const {
    trigger,
    formState: { isValidating },
  } = useFormContext<RegistrationValues>();

  async function advance() {
    if (await trigger("company", { shouldFocus: true }))
      navigate("/register/agency/contact");
  }

  return (
    <>
      <Link
        to="/welcome"
        className="back-link registration-back"
        aria-label={t("Back to welcome")}
      >
        <Icon name="back" />
      </Link>
      <RegistrationProgress currentStep={1} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
      >
        <RegistrationSection
          title="Company Information"
          icon="buildingFilled"
          description="Please provide your company details to get started."
        >
          <RegistrationField
            name="company.name"
            label="Name of Company"
            placeholder="Enter company name"
            icon="building"
            autoComplete="organization"
          />
          <RegistrationField
            name="company.employeeCount"
            label="Number of Employees"
            placeholder="Enter number"
            icon="people"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
          />
          <CompanyLocationFields />
          <RegistrationField
            name="company.registrationNumber"
            label="Commercial Registration Number"
            placeholder="Enter registration number"
            icon="id"
          />
          <RegistrationField
            name="company.address"
            label="Address of Company"
            placeholder="Enter company address"
            icon="pin"
            autoComplete="street-address"
          />
          <CompanyLogoField />
        </RegistrationSection>
        <div className="registration-actions registration-actions--next">
          <Button type="submit" disabled={isValidating}>
            {t("Next")}<Icon name="arrowRight" />
          </Button>
        </div>
      </form>
    </>
  );
}
