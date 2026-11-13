import { apiAuthEnabled } from "@/features/auth/auth-config";
import { OtpVerificationForm } from "@/features/auth/recovery/components/otp-verification-form";
import { RecoveryUnavailable } from "@/features/auth/recovery/components/recovery-unavailable";
export default function Page() {
  return apiAuthEnabled ? <RecoveryUnavailable /> : <OtpVerificationForm />;
}
