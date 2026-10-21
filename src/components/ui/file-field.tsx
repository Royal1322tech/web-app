import { useRef } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { FormField } from "./form-field";
import { Icon } from "./icon";
import "./file-field.css";

/** Optional single-file attachment for React Hook Form, shared by support forms. */
export function FileField({
  id,
  label,
  help,
  error,
  accept,
  chooseLabel,
  removeLabel,
  registration,
  selectedFile,
  onRemove,
}: {
  id: string;
  label: string;
  help: string;
  error?: string;
  accept: string;
  chooseLabel: string;
  removeLabel: string;
  registration: UseFormRegisterReturn;
  selectedFile?: File | null;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <FormField id={id} label={label} error={error}>
      <div className="file-field">
        <input
          id={id}
          type="file"
          accept={accept}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          {...registration}
          ref={(node) => {
            registration.ref(node);
            input.current = node;
          }}
        />
        <span className="file-field__icon" aria-hidden="true"><Icon name="upload" /></span>
        <span className="file-field__copy"><b>{chooseLabel}</b><small id={`${id}-help`}>{help}</small></span>
      </div>
      {selectedFile && (
        <div className="file-field__selected">
          <span><Icon name="document" /> <bdi>{selectedFile.name}</bdi></span>
          <button
            type="button"
            aria-label={removeLabel}
            onClick={() => {
              if (input.current) input.current.value = "";
              onRemove();
            }}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </FormField>
  );
}
