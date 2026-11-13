import { apiAuthEnabled } from "@/features/auth/auth-config";
import { ForgotPasswordForm } from "@/features/auth/recovery/components/forgot-password-form";
import { RecoveryUnavailable } from "@/features/auth/recovery/components/recovery-unavailable";
export default function Page() {
  return apiAuthEnabled ? <RecoveryUnavailable /> : <ForgotPasswordForm />;
}
