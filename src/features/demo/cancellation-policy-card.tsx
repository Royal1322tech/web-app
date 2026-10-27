import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import {
  type CancellationPolicy,
  type CancellationRule,
} from "@/features/hotels/cancellation-policy";

export function formatCharge(rule: CancellationRule, locale: "en" | "ar") {
  if (rule.charge?.kind === "percentage") {
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(
      rule.charge.percentage / 100,
    );
  }
  if (rule.charge?.kind === "amount") {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: rule.charge.currency,
      }).format(rule.charge.amount);
    } catch {
      return `${rule.charge.amount} ${rule.charge.currency}`;
    }
  }
  if (rule.charge?.kind === "non-refundable") {
    return locale === "ar" ? "غير قابل للاسترداد" : "Non-refundable";
  }
  return "—";
}

export function dateBoundary(value: string | undefined, timezone: string | undefined) {
  if (!value) return "—";
  return timezone ? `${value} · ${timezone}` : value;
}

export function CancellationPolicyCard({
  policy,
  roomName,
  rateName,
}: {
  policy?: CancellationPolicy;
  roomName: string;
  rateName: string;
}) {
  const { locale, t } = useLocale();
  const rules = policy?.rules ?? [];
  const hasLegacyDetails = Boolean(policy?.deadline || policy?.penalty || policy?.conditions);
  const hasRestrictions = Boolean(
    policy?.rateRestrictions?.length || rules.some((rule) => rule.restriction),
  );
  const hasNoShowOrEarlyCheckout = Boolean(policy?.noShow || policy?.earlyDeparture);

  return (
    <details className="cancellation-policy policy-accordion" open>
      <summary aria-controls="cancellation-policy-content">
        <span className="policy-accordion-icon"><Icon name="shield" /></span>
        <span className="policy-accordion-title">
          <strong>{t("Cancellation Policy", "سياسة الإلغاء")}</strong>
          <small>{roomName} · {rateName}</small>
        </span>
        <Icon className="policy-accordion-chevron" name="chevron" />
      </summary>
      <div id="cancellation-policy-content" className="policy-accordion-content">
        <div className="policy-table-scroll"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Focus lets keyboard users scroll the responsive table region.
          role="region" aria-label={t("Cancellation schedule", "جدول الإلغاء")} tabIndex={0}>
          <table className="policy-table">
            <thead>
              <tr>
                <th scope="col">{t("Cancelled on or after", "الإلغاء في أو بعد")}</th>
                <th scope="col">{t("Cancelled on or before", "الإلغاء في أو قبل")}</th>
                <th scope="col">{t("Cancellation Charge", "رسوم الإلغاء")}</th>
              </tr>
            </thead>
            {rules.length > 0 && (
              <tbody>
                {rules.map((rule, index) => (
                  <tr key={`${rule.cancelledOnOrAfter ?? "start"}-${rule.cancelledOnOrBefore ?? "end"}-${index}`}>
                    <td><bdi>{dateBoundary(rule.cancelledOnOrAfter, rule.timezone)}</bdi></td>
                    <td><bdi>{dateBoundary(rule.cancelledOnOrBefore, rule.timezone)}</bdi></td>
                    <td>{formatCharge(rule, locale)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {rules.length === 0 && (
          <p className="policy-empty">
            {policy?.kind === "non-refundable"
              ? t("This rate is non-refundable.", "هذا السعر غير قابل للاسترداد.")
              : t("Cancellation schedule not supplied for this offer.", "لم يُقدّم جدول الإلغاء لهذا العرض.")}
          </p>
        )}

        {hasLegacyDetails && policy && (
          <dl className="policy-facts policy-legacy-facts">
            {policy.deadline && <div><dt>{t("Cancellation deadline", "الموعد النهائي للإلغاء")}</dt><dd><bdi>{dateBoundary(policy.deadline, policy.timezone)}</bdi></dd></div>}
            {policy.penalty && <div><dt>{t("Cancellation charge", "رسوم الإلغاء")}</dt><dd>{policy.penalty[locale]}</dd></div>}
            {policy.conditions && <div><dt>{t("Refund conditions", "شروط الاسترداد")}</dt><dd>{policy.conditions[locale]}</dd></div>}
          </dl>
        )}

        {hasNoShowOrEarlyCheckout ? (
          <dl className="policy-conditions">
            {policy?.noShow && <div>
              <dt>{t("No-Show Charges", "رسوم عدم الحضور")}</dt>
              <dd>{policy.noShow[locale]}</dd>
            </div>}
            {policy?.earlyDeparture && <div>
              <dt>{t("Early Check-Out Conditions", "شروط المغادرة المبكرة")}</dt>
              <dd>{policy.earlyDeparture[locale]}</dd>
            </div>}
          </dl>
        ) : (
          <p className="policy-empty policy-conditions-empty">
            {t("No no-show or early check-out terms were supplied.", "لم تُقدّم شروط لعدم الحضور أو المغادرة المبكرة.")}
          </p>
        )}

        {hasRestrictions && policy && (
          <div className="policy-subsection">
            <h3>{t("Rate restrictions", "قيود السعر")}</h3>
            <ul className="policy-restrictions">
              {policy.rateRestrictions?.map((restriction) => <li key={restriction.en}>{restriction[locale]}</li>)}
              {rules.flatMap((rule, index) => rule.restriction ? [<li key={`${index}-${rule.restriction.en}`}>{rule.restriction[locale]}</li>] : [])}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
