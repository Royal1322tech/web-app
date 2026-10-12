import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationDefaults,
  registrationSchema,
  type RegistrationValues,
} from "../schemas/registration.schema";

export function RegistrationFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: registrationDefaults,
    shouldUnregister: false,
    reValidateMode: "onChange",
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
