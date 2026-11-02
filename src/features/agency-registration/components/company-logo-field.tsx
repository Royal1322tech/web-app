import { useRef } from "react";
import { useController, useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { inspectLogoFile, logoAccept } from "../lib/company-logo";
import type { RegistrationValues } from "../schemas/registration.schema";
import { CompanyLogoPreview } from "./company-logo-preview";

const ID = "company-logo";

/**
 * Required logo picker. A file enters the form only after its content is verified; a rejected
 * replacement leaves the current logo in place. The File stays in form memory and is not uploaded.
 */
export function CompanyLogoField() {
  const { t, locale } = useLocale();
  const { control, setValue, setError } = useFormContext<RegistrationValues>();
  const {
    field: { value: logo, name, ref, onBlur },
    fieldState: { error },
  } = useController({ control, name: "company.logo" });
  const input = useRef<HTMLInputElement | null>(null);
  const latestSelection = useRef(0);

  async function select(file: File) {
    const selection = ++latestSelection.current;
    const issue = await inspectLogoFile(file);
    // Ignore the result if a newer file was chosen, or Remove was pressed, in the meantime.
    if (selection !== latestSelection.current) return;
    if (issue) setError("company.logo", { type: "manual", message: issue }, { shouldFocus: true });
    else setValue("company.logo", file, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }

  function remove() {
    latestSelection.current += 1;
    setValue("company.logo", null, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    input.current?.focus();
  }

  const label = t("Company Logo", "شعار الشركة");
  return (
    <div className="company-logo" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <FormField id={ID} label={label} required error={error?.message ? t(error.message) : undefined}>
        <div className={`company-logo__box${logo ? " company-logo__box--filled" : ""}${error ? " company-logo__box--invalid" : ""}`}>
          <input
            id={ID}
            name={name}
            ref={(node) => {
              ref(node);
              input.current = node;
            }}
            type="file"
            accept={logoAccept}
            className="company-logo__input"
            tabIndex={logo ? -1 : undefined}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={`${ID}-help${error ? ` ${ID}-error` : ""}`}
            onBlur={onBlur}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void select(file);
              // Resetting lets the same file be chosen again.
              event.currentTarget.value = "";
            }}
          />
          {logo ? (
            <>
              <span className="company-logo__frame">
                <CompanyLogoPreview file={logo} alt={t(`Preview of ${logo.name}`, `معاينة ${logo.name}`)} />
              </span>
              <span className="company-logo__details">
                <strong><bdi>{logo.name}</bdi></strong>
                <span className="company-logo__actions">
                  <button type="button" className="button button--outline button--sm" onClick={() => input.current?.click()}>
                    {t("Change Logo", "تغيير الشعار")}
                  </button>
                  <button type="button" className="button button--ghost button--sm" onClick={remove}>
                    {t("Remove Logo", "إزالة الشعار")}
                  </button>
                </span>
              </span>
            </>
          ) : (
            <span className="company-logo__prompt" aria-hidden="true">
              <Icon name="upload" />
              <strong>{t("Upload Company Logo", "رفع شعار الشركة")}</strong>
            </span>
          )}
        </div>
        <p className="document-help" id={`${ID}-help`}>
          {t("PNG, JPG or WEBP. Maximum 2MB. The file stays on this device and is not uploaded.", "PNG أو JPG أو WEBP. الحد الأقصى 2 ميجابايت. يبقى الملف على هذا الجهاز ولا يتم رفعه.")}
        </p>
      </FormField>
    </div>
  );
}
