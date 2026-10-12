import { useController, useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import {
  documentAccept,
  documentHelp,
  type DocumentName,
} from "../data/documents";
import type { RegistrationValues } from "../schemas/registration.schema";

export function DocumentField({
  name,
  label,
}: {
  name: DocumentName;
  label: string;
}) {
  const { control, setValue } = useFormContext<RegistrationValues>();
  const path = `documents.${name}` as const;
  const {
    field: { value: selectedFile, name: inputName, ref: inputRef, onBlur },
    fieldState: { error },
  } = useController({ control, name: path });
  const id = `document-${name}`;

  function selectFile(file: File | null) {
    setValue(path, file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  return (
    <FormField id={id} label={label} required error={error?.message}>
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
          {selectedFile ? "Replace Document" : "Upload Document"}
        </span>
      </div>
      <p className="document-help" id={`${id}-help`}>
        {documentHelp}
      </p>
      <div
        className="document-selection"
        id={`${id}-selected`}
        aria-live="polite"
      >
        {selectedFile && (
          <span>
            <Icon name="document" />
            {selectedFile.name}
          </span>
        )}
      </div>
      {selectedFile && (
        <button
          type="button"
          className="text-button document-remove"
          onClick={() => selectFile(null)}
          aria-label={`Remove ${label}`}
        >
          Remove
        </button>
      )}
    </FormField>
  );
}
