import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useFormContext, useWatch } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { businessTypes, requiredDocumentsFor } from "../data/business-types";
import { documentHelp, registrationDocuments } from "../data/documents";
import { useRegistrationStepGuard } from "../hooks/use-registration-step-guard";
import type { RegistrationValues } from "../schemas/registration.schema";
import { DocumentField } from "./document-field";
import { RegistrationProgress } from "./registration-progress";
import { RegistrationSection } from "./registration-section";

export function UploadDocumentsForm() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const canAccess = useRegistrationStepGuard(3);
  const {
    trigger,
    register,
    control,
    clearErrors,
    getFieldState,
    formState,
  } = useFormContext<RegistrationValues>();
  const businessType = useWatch({ control, name: "documents.businessType" });
  const required = requiredDocumentsFor(businessType);
  const visibleDocuments = registrationDocuments.filter(({ name }) => required.includes(name));
  const typeError = getFieldState("documents.businessType", formState).error?.message;

  async function advance() {
    if (await trigger("documents", { shouldFocus: true }))
      navigate("/register/agency/review");
  }

  if (!canAccess)
    return <p role="status">{t("Returning to the first incomplete step…")}</p>;

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
          <fieldset
            className="business-type"
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            aria-describedby={typeError ? "business-type-error" : undefined}
          >
            <legend>
              {t("Company Business Type", "نوع نشاط الشركة")}
              <span className="required-mark" aria-hidden="true"> *</span>
            </legend>
            <div className="business-type__options">
              {businessTypes.map((type) => (
                <label key={type.value} className="business-type__option">
                  <input
                    type="radio"
                    value={type.value}
                    {...register("documents.businessType", {
                      onChange: (event: { target: { value: string } }) => {
                        // Documents that are no longer required must not keep stale errors.
                        const next = requiredDocumentsFor(event.target.value);
                        clearErrors(
                          registrationDocuments
                            .filter(({ name }) => !next.includes(name))
                            .map(({ name }) => `documents.${name}` as const),
                        );
                        clearErrors("documents.businessType");
                      },
                    })}
                  />
                  <span>{type.label[locale]}</span>
                </label>
              ))}
            </div>
            {typeError && (
              <p className="field-error" id="business-type-error" role="alert">
                {t(typeError)}
              </p>
            )}
          </fieldset>
          {visibleDocuments.map((document) => (
            <DocumentField
              key={document.name}
              path={`documents.${document.name}`}
              id={`document-${document.name}`}
              label={t(document.label)}
              help={t(documentHelp)}
              uploadLabel={t("Upload Document")}
              replaceLabel={t("Replace Document")}
              removeLabel={t("Remove")}
              translate={(message) => t(message)}
            />
          ))}
          {!businessType && (
            <p className="document-help" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
              {t("Choose your business type to see the required documents.", "اختر نوع نشاطك لعرض المستندات المطلوبة.")}
            </p>
          )}
        </RegistrationSection>
        <div className="registration-actions">
          <Link
            to="/register/agency/contact"
            className={buttonClass("outline")}
          >
            <Icon name="back" />{t("Back")}
          </Link>
          <Button type="submit" disabled={formState.isValidating}>
            {t("Next")}<Icon name="arrowRight" />
          </Button>
        </div>
      </form>
    </>
  );
}
