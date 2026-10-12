import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormContext, useWatch } from "react-hook-form";
import {
  companySchema,
  contactSchema,
  type RegistrationValues,
} from "../schemas/registration.schema";
import { documentsSchema } from "../schemas/documents.schema";

export function useRegistrationStepGuard(step: 2 | 3 | 4) {
  const navigate = useNavigate();
  const { control } = useFormContext<RegistrationValues>();
  const [company, contact, documents] = useWatch({
    control,
    name: ["company", "contact", "documents"],
  });
  let destination: string | null = null;

  if (!companySchema.safeParse(company).success) {
    destination = "/register/agency/company";
  } else if (step > 2 && !contactSchema.safeParse(contact).success) {
    destination = "/register/agency/contact";
  } else if (step > 3 && !documentsSchema.safeParse(documents).success) {
    destination = "/register/agency/documents";
  }

  useEffect(() => {
    if (destination) navigate(destination, { replace: true });
  }, [destination, navigate]);

  return destination === null;
}
