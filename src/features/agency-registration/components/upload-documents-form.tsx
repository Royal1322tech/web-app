import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { registrationDocuments } from "../data/documents";
import { useRegistrationStepGuard } from "../hooks/use-registration-step-guard";
import type { RegistrationValues } from "../schemas/registration.schema";
import { DocumentField } from "./document-field";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";

export function UploadDocumentsForm() {
  const navigate = useNavigate();
  const canAccess = useRegistrationStepGuard(3);
  const {
    trigger,
    formState: { isValidating },
  } = useFormContext<RegistrationValues>();

  async function advance() {
    if (await trigger("documents", { shouldFocus: true }))
      navigate("/register/agency/review");
  }

  if (!canAccess)
    return <p role="status">Returning to the first incomplete step…</p>;

  return (
    <>
      <RegistrationProgress currentStep={3} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
      >
        <RegistrationSection
          title="Upload Documents"
          description="Select your agency documents. Files remain on this device and are not uploaded."
          icon="upload"
          contentClassName="document-fields"
        >
          {registrationDocuments.map((document) => (
            <DocumentField key={document.name} {...document} />
          ))}
        </RegistrationSection>
        <div className="registration-actions">
          <Link
            to="/register/agency/contact"
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
