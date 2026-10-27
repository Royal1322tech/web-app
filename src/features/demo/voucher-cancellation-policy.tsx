import { cancellationPolicyLabels, type CancellationPolicy } from "@/features/hotels/cancellation-policy";
import { useLocale } from "@/features/localization/locale-provider";
import { dateBoundary, formatCharge } from "./cancellation-policy-card";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const WITH_OFFSET = /([zZ]|[+-]\d{2}:?\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

/**
 * Formats a supplier deadline without guessing missing parts: a date-only value shows no time,
 * an instant is shown in the policy's time zone (or UTC), and a local wall-clock time keeps the
 * supplied zone label. Anything unrecognised is shown exactly as supplied.
 */
export function formatPolicyDeadline(value: string, timezone: string | undefined, locale: "en" | "ar"): string {
  try {
    if (DATE_ONLY.test(value)) {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
    }
    if (WITH_OFFSET.test(value) && Number.isFinite(Date.parse(value))) {
      const zone = timezone ?? "UTC";
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(new Date(value));
      return `${formatted} · ${zone}`;
    }
    const local = LOCAL_DATE_TIME.exec(value);
    if (local) {
      const [, year, month, day, hour, minute] = local;
      const wallClock = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(wallClock);
      return timezone ? `${formatted} · ${timezone}` : formatted;
    }
  } catch {
    // An unknown time zone falls through to the supplied text.
  }
  return dateBoundary(value, timezone);
}

/** Cancellation Policy section of the accommodation voucher. Shows only what the booking snapshot contains. */
export function VoucherCancellationPolicy({ policy }: { policy?: CancellationPolicy }) {
  const { t, locale } = useLocale();
  const kind = policy?.kind ?? "unavailable";
  const rules = policy?.rules ?? [];
  const deadline = policy?.deadline ? formatPolicyDeadline(policy.deadline, policy.timezone, locale) : undefined;

  return (
    <section className="voucher__section voucher-policy" aria-labelledby="voucher-cancellation" data-policy={kind}>
      <h3 id="voucher-cancellation">{t("Cancellation Policy", "سياسة الإلغاء")}</h3>
      <div className="voucher-policy__summary">
        <p className="voucher-policy__badge">{cancellationPolicyLabels[kind][locale]}</p>
        <p className="voucher-policy__lead">
          {kind === "free" &&
            (deadline
              ? t("This booking can be cancelled free of charge until the deadline below.", "يمكن إلغاء هذا الحجز مجانًا حتى الموعد النهائي أدناه.")
              : t("Free cancellation applies, but no deadline was supplied. Confirm the deadline with Royal Vacation before cancelling.", "الإلغاء المجاني متاح، لكن لم يُقدَّم موعد نهائي. أكّد الموعد مع رويال فاكيشن قبل الإلغاء."))}
          {kind === "non-refundable" && t("This rate is non-refundable.", "هذا السعر غير قابل للاسترداد.")}
          {kind === "conditional" && t("Cancellation charges apply according to the supplied terms below.", "تُطبَّق رسوم الإلغاء وفق الشروط المقدمة أدناه.")}
          {kind === "unavailable" &&
            t(
              "Cancellation policy information was not supplied for this booking. This does not mean the booking is non-refundable — confirm the terms with Royal Vacation before cancelling.",
              "لم تُقدَّم معلومات سياسة الإلغاء لهذا الحجز. هذا لا يعني أن الحجز غير قابل للاسترداد — أكّد الشروط مع رويال فاكيشن قبل الإلغاء.",
            )}
        </p>
      </div>

      {kind !== "unavailable" && policy && (
        <>
          {(deadline || policy.penalty || policy.conditions || policy.noShow || policy.earlyDeparture) && (
            <dl className="voucher__facts">
              {deadline && (
                <div>
                  <dt>{kind === "free" ? t("Free cancellation until", "الإلغاء المجاني حتى") : t("Cancellation deadline", "الموعد النهائي للإلغاء")}</dt>
                  <dd><bdi>{deadline}</bdi></dd>
                </div>
              )}
              {policy.penalty && <div><dt>{t("Cancellation charge", "رسوم الإلغاء")}</dt><dd>{policy.penalty[locale]}</dd></div>}
              {policy.conditions && <div><dt>{t("Terms and conditions", "الشروط والأحكام")}</dt><dd>{policy.conditions[locale]}</dd></div>}
              {policy.noShow && <div><dt>{t("No-Show Charges", "رسوم عدم الحضور")}</dt><dd>{policy.noShow[locale]}</dd></div>}
              {policy.earlyDeparture && <div><dt>{t("Early Check-Out Conditions", "شروط المغادرة المبكرة")}</dt><dd>{policy.earlyDeparture[locale]}</dd></div>}
            </dl>
          )}
          {rules.length > 0 && (
            <table className="voucher__table voucher-policy__rules">
              <thead>
                <tr>
                  <th scope="col">{t("Cancelled on or after", "الإلغاء في أو بعد")}</th>
                  <th scope="col">{t("Cancelled on or before", "الإلغاء في أو قبل")}</th>
                  <th scope="col">{t("Cancellation Charge", "رسوم الإلغاء")}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, index) => (
                  <tr key={`${rule.cancelledOnOrAfter ?? "start"}-${rule.cancelledOnOrBefore ?? "end"}-${index}`}>
                    <td><bdi>{rule.cancelledOnOrAfter ? formatPolicyDeadline(rule.cancelledOnOrAfter, rule.timezone ?? policy.timezone, locale) : "—"}</bdi></td>
                    <td><bdi>{rule.cancelledOnOrBefore ? formatPolicyDeadline(rule.cancelledOnOrBefore, rule.timezone ?? policy.timezone, locale) : "—"}</bdi></td>
                    <td>{formatCharge(rule, locale)}{rule.refundConditions && <span className="voucher-policy__note">{rule.refundConditions[locale]}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
