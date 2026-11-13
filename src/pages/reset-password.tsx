import { apiAuthEnabled } from "@/features/auth/auth-config";
import { ResetPasswordForm } from "@/features/auth/recovery/components/reset-password-form";
import { RecoveryUnavailable } from "@/features/auth/recovery/components/recovery-unavailable";
export default function Page() {
  return apiAuthEnabled ? <RecoveryUnavailable /> : <ResetPasswordForm />;
}
