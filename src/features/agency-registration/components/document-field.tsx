import { useController, useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { documentAccept, documentHelp } from "../data/documents";
import type { RegistrationValues } from "../schemas/registration.schema";

export type RegistrationFilePath =
  | "documents.commercialRegistration"
  | "documents.tourismLicence"
  | "documents.taxCertificate"
  | "contact.idDocument";

/** Client-side file picker: the File stays in form memory and is never uploaded or stored. */
export function DocumentField({
  path,
  id,
  label,
  help = documentHelp,
  uploadLabel = "Upload Document",
  replaceLabel = "Replace Document",
  removeLabel = "Remove",
  translate = (message) => message,
}: {
  path: RegistrationFilePath;
  id: string;
  label: string;
  help?: string;
  uploadLabel?: string;
  replaceLabel?: string;
  removeLabel?: string;
  translate?: (message: string) => string;
}) {
  const { control, setValue } = useFormContext<RegistrationValues>();
  const {
    field: { value: selectedFile, name: inputName, ref: inputRef, onBlur },
    fieldState: { error },
  } = useController({ control, name: path });

  function selectFile(file: File | null) {
    setValue(path, file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  return (
    <FormField id={id} label={label} required error={error?.message ? translate(error.message) : undefined}>
      <div
        className={`document-picker${error ? " document-picker--invalid" : ""}`}
      >
        <input
          id={id}
          name={inputName}
          ref={inputRef}
          type="file"
          accept={documentAccept}
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={`${id}-help ${id}-selected${error ? ` ${id}-error` : ""}`}
          onBlur={onBlur}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) selectFile(file);
            // The provider retains the File; resetting lets the same file be selected again.
            event.currentTarget.value = "";
          }}
        />
        <span aria-hidden="true">
          <Icon name="upload" />
          {selectedFile ? replaceLabel : uploadLabel}
        </span>
      </div>
      <p className="document-help" id={`${id}-help`}>
        {help}
      </p>
      <div
        className="document-selection"
        id={`${id}-selected`}
        aria-live="polite"
      >
        {selectedFile && (
          <span>
            <Icon name="document" />
            <bdi>{selectedFile.name}</bdi>
          </span>
        )}
      </div>
      {selectedFile && (
        <button
          type="button"
          className="text-button document-remove"
          onClick={() => selectFile(null)}
          aria-label={`${removeLabel} ${label}`}
        >
          {removeLabel}
        </button>
      )}
    </FormField>
  );
}
