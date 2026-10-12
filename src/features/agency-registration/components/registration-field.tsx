import type { ComponentProps } from "react";
import { useFormContext, type FieldPathByValue } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RegistrationValues } from "../schemas/registration.schema";

type RegistrationFieldProps = {
  name: FieldPathByValue<RegistrationValues, string>;
  label: string;
  options?: readonly { value: string; label: string }[];
} & Pick<
  ComponentProps<typeof Input>,
  | "icon"
  | "type"
  | "placeholder"
  | "autoComplete"
  | "inputMode"
  | "min"
  | "step"
>;

export function RegistrationField({
  name,
  label,
  options,
  placeholder,
  ...inputProps
}: RegistrationFieldProps) {
  const { register, getFieldState, formState } =
    useFormContext<RegistrationValues>();
  const { error } = getFieldState(name, formState);
  const id = name.replace(".", "-");
  const commonProps = {
    id,
    required: true,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    ...register(name),
  };

  return (
    <FormField id={id} label={label} required error={error?.message}>
      {options ? (
        <Select
          {...commonProps}
          icon={inputProps.icon}
          autoComplete={inputProps.autoComplete}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : (
        <Input {...commonProps} {...inputProps} placeholder={placeholder} />
      )}
    </FormField>
  );
}
