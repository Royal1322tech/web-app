import { Outlet } from "react-router-dom";
import { RegistrationShell } from "@/features/agency-registration/components/registration-shell";
import { RegistrationFormProvider } from "@/features/agency-registration/providers/registration-form-provider";

export default function RegistrationLayout() {
  return (
    <RegistrationShell>
      <RegistrationFormProvider>
        <Outlet />
      </RegistrationFormProvider>
    </RegistrationShell>
  );
}
