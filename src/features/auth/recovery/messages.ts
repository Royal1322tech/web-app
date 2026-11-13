import { useLocale } from "@/features/localization/locale-provider";
const arabic: Record<string, string> = {
  "Password recovery isn't available online yet. These screens are a preview: no email is sent and no code is checked.":
    "استعادة كلمة المرور غير متاحة عبر الإنترنت بعد. هذه الشاشات للمعاينة فقط: لا يُرسل أي بريد ولا يُتحقق من أي رمز.",
  "Contact Royal Vacation to reset your password": "تواصل مع رويال فاكيشن لإعادة تعيين كلمة المرور",
  "Continue to verification demo": "المتابعة لمعاينة التحقق",
  "Continue to reset demo": "المتابعة لمعاينة إعادة التعيين",
  "Return to sign in": "العودة لتسجيل الدخول",
  "Forgot Your Password?": "نسيت كلمة المرور؟",
  "Enter the 4-digit verification code": "أدخل رمز التحقق المكوّن من ٤ أرقام",
  "Enter Your New Password": "أدخل كلمة المرور الجديدة",
  "User Name": "اسم المستخدم",
  "E-mail": "البريد الإلكتروني",
  Send: "إرسال",
  Cancel: "إلغاء",
  Confirm: "تأكيد",
  "I forgot my email or user name?": "نسيت البريد الإلكتروني أو اسم المستخدم؟",
  "Account recovery help is not connected yet. Please use your existing account support channel.":
    "مساعدة استرداد الحساب غير متصلة بعد. يرجى استخدام قناة دعم حسابك الحالية.",
  "Back to sign in": "العودة إلى تسجيل الدخول",
  "Back to password recovery": "العودة إلى استرداد كلمة المرور",
  "Back to verification": "العودة إلى التحقق",
  Password: "كلمة المرور",
  "Confirm Password": "تأكيد كلمة المرور",
  "Show password": "إظهار كلمة المرور",
  "Hide password": "إخفاء كلمة المرور",
  "Show confirmation password": "إظهار تأكيد كلمة المرور",
  "Hide confirmation password": "إخفاء تأكيد كلمة المرور",
  "Enter your username.": "أدخل اسم المستخدم.",
  "Enter your email.": "أدخل البريد الإلكتروني.",
  "Enter a valid email address.": "أدخل بريداً إلكترونياً صحيحاً.",
  "Enter your new password.": "أدخل كلمة المرور الجديدة.",
  "Use at least 8 characters.": "استخدم ٨ أحرف على الأقل.",
  "Use no more than 128 characters.": "استخدم ١٢٨ حرفاً كحد أقصى.",
  "Confirm your password.": "أكّد كلمة المرور.",
  "Passwords must match.": "يجب أن تتطابق كلمتا المرور.",
  "Enter all four digits.": "أدخل الأرقام الأربعة كاملة.",
  "Use digits only.": "استخدم الأرقام فقط.",
  "Password recovery is not connected yet. No email has been sent.":
    "استرداد كلمة المرور غير متصل بعد. لم يتم إرسال أي بريد إلكتروني.",
  "Verification is not connected yet. No code has been sent or verified.":
    "التحقق غير متصل بعد. لم يتم إرسال أي رمز أو التحقق منه.",
  "Password reset is not connected yet. Your password has not been changed.":
    "إعادة تعيين كلمة المرور غير متصلة بعد. لم يتم تغيير كلمة المرور.",
  "Recovery service unavailable": "خدمة الاسترداد غير متاحة",
  "Verification code": "رمز التحقق",
  "Use the four-digit code from your recovery email when verification becomes available.":
    "استخدم الرمز المكوّن من أربعة أرقام من بريد الاسترداد عندما تتاح خدمة التحقق.",
  "Check this field.": "تحقق من هذا الحقل.",
};
export function useRecoveryText() {
  const { locale, t, setLocale } = useLocale();
  return {
    locale,
    setLocale,
    text: (message: string) =>
      t(message, arabic[message] ?? "تحقق من هذا الحقل."),
  };
}
