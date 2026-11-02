import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";
import "./group-requests.css";

export function GroupRequestSaving() {
  const { t } = useLocale();
  return (
    <section className="group-saving" role="status" aria-live="polite">
      <ResponsiveImage src="/images/welcome/resort-aerial.jpg" alt="" width={1600} height={1067} sizes="(max-width: 1000px) 100vw, 1000px" eager />
      <div className="group-saving__copy">
        <span className="group-saving__ring" aria-hidden="true"><Icon name="plane" /></span>
        <h2>{t("Saving your demo request", "جارٍ حفظ طلبك التجريبي")}</h2>
        <p>{t("Your details are kept while this finishes. Please stay on this page.", "تُحفظ بياناتك حتى تكتمل العملية. يرجى البقاء في هذه الصفحة.")}</p>
        <span className="group-saving__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </section>
  );
}

export function GroupRequestSaved({ reference }: { reference: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };
  const next: { icon: IconName; title: string; body: string }[] = [
    { icon: "check", title: t("Saved for this demo", "محفوظ لهذا العرض التجريبي"), body: t("It stays in this browser session until the page is reloaded.", "يبقى في جلسة المتصفح هذه حتى إعادة تحميل الصفحة.") },
    { icon: "document", title: t("Track it here", "تابعه من هنا"), body: t("Open it any time from My Group Requests.", "افتحه في أي وقت من طلبات مجموعاتي.") },
    { icon: "mail", title: t("Need a real quotation?", "تحتاج عرض سعر فعليًا؟"), body: t("This request was not sent. Use Contact Us to reach Royal Vacation.", "لم يُرسل هذا الطلب. استخدم صفحة تواصل معنا للوصول إلى رويال فاكيشن.") },
  ];
  return (
    <section className="group-result" data-result="saved">
      <span className="group-result__icon" aria-hidden="true"><Icon name="check" /></span>
      <h2 ref={heading} tabIndex={-1}>{t("Your demo group request is saved", "تم حفظ طلب المجموعة التجريبي")}</h2>
      <p>{t("It is saved locally for demonstration. It was not sent to Royal Vacation.", "حُفظ محليًا لأغراض العرض التجريبي ولم يُرسل إلى رويال فاكيشن.")}</p>
      <div className="group-result__reference">
        <span className="group-result__reference-icon" aria-hidden="true"><Icon name="document" /></span>
        <div>
          <span>{t("Request Reference", "مرجع الطلب")}</span>
          <strong><bdi>{reference}</bdi></strong>
        </div>
        <button type="button" className="button button--outline" onClick={() => void copy()}>
          <Icon name={copied === "copied" ? "check" : "copy"} />
          {copied === "copied" ? t("Copied", "تم النسخ") : t("Copy Reference", "نسخ المرجع")}
        </button>
      </div>
      <p className="group-result__copy-status" role="status">
        {copied === "copied" && t("Reference copied.", "تم نسخ المرجع.")}
        {copied === "failed" && t("Copying is unavailable here. Please select the reference and copy it.", "النسخ غير متاح هنا. يرجى تحديد المرجع ونسخه.")}
      </p>
      <ul className="group-result__next">
        {next.map((item) => <li key={item.title}><span aria-hidden="true"><Icon name={item.icon} /></span><strong>{item.title}</strong><small>{item.body}</small></li>)}
      </ul>
      <p className="group-result__note">{t("This is a request reference, not a hotel booking reference.", "هذا مرجع طلب وليس مرجع حجز فندق.")}</p>
      <div className="group-result__actions">
        <Link className="button button--outline" to="/">{t("Back to Home", "العودة إلى الرئيسية")}</Link>
        <Link className="button button--primary" to="/group-requests">{t("View My Requests", "عرض طلباتي")}<Icon name="arrowRight" /></Link>
      </div>
    </section>
  );
}

export function GroupRequestFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <section className="group-result" data-result="failed" role="alert">
      <span className="group-result__icon" aria-hidden="true"><Icon name="close" /></span>
      <h2>{t("We couldn't save your demo request", "تعذر حفظ طلبك التجريبي")}</h2>
      <p>{t("Nothing was saved. The details you entered are still here. Please sign in and try again, or contact support.", "لم يُحفظ أي شيء، وما زالت بياناتك موجودة. يرجى تسجيل الدخول والمحاولة مرة أخرى أو التواصل مع الدعم.")}</p>
      <div className="group-result__actions">
        <button type="button" className="button button--primary" onClick={onRetry}>{t("Try Again", "إعادة المحاولة")}</button>
        <Link className="button button--outline" to="/contact">{t("Contact Support", "تواصل مع الدعم")}</Link>
      </div>
    </section>
  );
}
