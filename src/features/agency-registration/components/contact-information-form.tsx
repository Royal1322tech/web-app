import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { type RegistrationValues } from "../schemas/registration.schema";
import { countries } from "../data/countries";
import { useLocale } from "@/features/localization/locale-provider";
import { ContactPhoneField } from "./contact-phone-field";
import { DocumentField } from "./document-field";
import { RegistrationField } from "./registration-field";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";
import { useRegistrationStepGuard } from "../hooks/use-registration-step-guard";

export function ContactInformationForm() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const canAccess = useRegistrationStepGuard(2);
  const {
    trigger,
    formState: { isValidating },
  } = useFormContext<RegistrationValues>();
  async function advance() {
    if (await trigger("contact", { shouldFocus: true }))
      navigate("/register/agency/documents");
  }

  if (!canAccess) return <p role="status">Returning to Company Information…</p>;

  return (
    <>
      <RegistrationProgress currentStep={2} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
      >
        <RegistrationSection
          title="Contact Information"
          icon="personFilled"
          description="Provide the details of the owner or the employee responsible for this account."
        >
          <RegistrationField
            name="contact.fullName"
            label="Full Name"
            placeholder="Enter full name"
            icon="personFilled"
            autoComplete="name"
          />
          <RegistrationField
            name="contact.nationality"
            label="Nationality"
            placeholder="Select citizenship country"
            icon="globe"
            options={countries}
          />
          <RegistrationField
            name="contact.idNumber"
            label="ID Number"
            placeholder="Enter ID number"
            icon="id"
          />
          <div className="registration-id-document" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
            <DocumentField
              path="contact.idDocument"
              id="contact-id-document"
              label={t("Attach ID Document", "إرفاق مستند الهوية")}
              help={t(
                "PDF, JPG/JPEG or PNG. Maximum 5 MB. The file stays on this device and is not uploaded.",
                "PDF أو JPG/JPEG أو PNG. الحد الأقصى ٥ ميغابايت. يبقى الملف على هذا الجهاز ولا يتم رفعه.",
              )}
              uploadLabel={t("Upload ID Document", "رفع مستند الهوية")}
              replaceLabel={t("Replace ID Document", "استبدال مستند الهوية")}
              removeLabel={t("Remove", "إزالة")}
              translate={(message) => t(message)}
            />
          </div>
          <ContactPhoneField />
          <RegistrationField
            name="contact.email"
            label="Email"
            placeholder="Enter email address"
            icon="mail"
            type="email"
            autoComplete="email"
          />
        </RegistrationSection>
        <div className="registration-actions">
          <Link
            to="/register/agency/company"
            className={buttonClass("outline")}
          >
            Back
          </Link>
          <Button type="submit" disabled={isValidating}>
            Next
          </Button>
        </div>
      </form>
    </>
  );
}
