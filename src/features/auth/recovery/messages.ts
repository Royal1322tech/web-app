import { useLocale } from "@/features/localization/locale-provider";
const arabic: Record<string, string> = {
  "Online password reset isn't available yet. Contact Royal Vacation to reset your password.":
    "إعادة تعيين كلمة المرور عبر الإنترنت غير متاحة حاليًا. تواصل مع رويال فاكيشن لإعادة تعيينها.",
  "Contact Royal Vacation to reset your password": "تواصل مع رويال فاكيشن لإعادة تعيين كلمة المرور",
  "Continue to verification": "المتابعة إلى التحقق",
  "Continue to reset": "المتابعة لإعادة التعيين",
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
  "Online account recovery isn't available yet. Please contact your account support channel.":
    "استرداد الحساب عبر الإنترنت غير متاح حاليًا. يرجى التواصل مع قناة دعم حسابك.",
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
  "Online password recovery isn't available yet. No email has been sent.":
    "استرداد كلمة المرور عبر الإنترنت غير متاح حاليًا. لم يُرسل أي بريد إلكتروني.",
  "Online verification isn't available yet. No code has been sent or checked.":
    "التحقق عبر الإنترنت غير متاح حاليًا. لم يُرسل أي رمز ولم يُتحقق منه.",
  "Online password reset isn't available yet. Your password hasn't been changed.":
    "إعادة تعيين كلمة المرور عبر الإنترنت غير متاحة حاليًا. لم تتغير كلمة المرور.",
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
