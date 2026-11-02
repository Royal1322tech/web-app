import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import type { GroupFormValues, GroupRequestService } from "./group-request-types";
import { useServiceLabel } from "./group-request-ui";
import "./group-quotation-wizard.css";

type Step = 0 | 1 | 2;

const tripFields = ["destination", "passengers", "start", "end", "rooms", "service"] as const;
const contactFields = ["name", "email", "agency", "subject", "message"] as const;

/**
 * Presents the existing group quotation form in three steps. Every step stays mounted, so moving
 * between them never loses input. Validation is the page's schema, run for one step's fields at a time.
 */
export function GroupQuotationWizard({ form, preview, onPreviewChange, onSave }: {
  form: UseFormReturn<GroupFormValues>;
  preview: boolean;
  onPreviewChange: (preview: boolean) => void;
  onSave: () => void;
}) {
  const { t, locale } = useLocale();
  const { register, trigger, getValues, setValue, handleSubmit, formState: { errors, isSubmitting } } = form;
  const serviceLabel = useServiceLabel();
  const [step, setStep] = useState<Step>(0);
  const wizard = useRef<HTMLDivElement>(null);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    wizard.current?.scrollIntoView({ block: "start" });
    headings.current[step]?.focus({ preventScroll: true });
  }, [step]);

  const goTo = (next: Step) => {
    moved.current = true;
    onPreviewChange(false);
    setStep(next);
  };
  const next = async () => {
    const valid = await trigger(step === 0 ? [...tripFields] : [...contactFields], { shouldFocus: true });
    if (valid) goTo((step + 1) as Step);
  };
  // Enter in a field must not jump ahead or submit. Buttons and multi-line text keep their usual behaviour.
  const guardEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
  };

  const steps = [t("Trip Details", "تفاصيل الرحلة"), t("Group & Contact", "المجموعة والتواصل"), t("Review & Save", "المراجعة والحفظ")];
  const text = (key: (typeof tripFields)[number] | (typeof contactFields)[number], label: string, options: { icon?: IconName; type?: string; required?: boolean; autoComplete?: string; placeholder?: string } = {}) => (
    <FormField id={`enquiry-${key}`} label={label} required={options.required} error={errors[key]?.message}>
      <div className={options.icon ? "wizard-input wizard-input--icon" : "wizard-input"}>
        {options.icon && <Icon name={options.icon} />}
        <input
          id={`enquiry-${key}`}
          className="input"
          type={options.type ?? "text"}
          required={options.required}
          autoComplete={options.autoComplete}
          placeholder={options.placeholder}
          dir={options.type === "email" ? "ltr" : undefined}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `enquiry-${key}-error` : undefined}
          {...register(key)}
        />
      </div>
    </FormField>
  );
  const count = (key: "passengers" | "rooms", label: string, required: boolean) => {
    const change = (by: number) => {
      const current = Number(getValues(key));
      const value = Number.isInteger(current) && current > 0 ? Math.max(1, current + by) : 1;
      setValue(key, String(value), { shouldDirty: true, shouldValidate: !!errors[key] });
    };
    return (
      <FormField id={`enquiry-${key}`} label={label} required={required} error={errors[key]?.message}>
        <div className="wizard-count">
          <button type="button" aria-label={t(`Decrease ${label}`, `تقليل ${label}`)} onClick={() => change(-1)}><Icon name="minus" /></button>
          <input id={`enquiry-${key}`} className="input" type="number" min={1} step={1} required={required} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `enquiry-${key}-error` : undefined} {...register(key)} />
          <button type="button" aria-label={t(`Increase ${label}`, `زيادة ${label}`)} onClick={() => change(1)}><Icon name="plus" /></button>
        </div>
      </FormField>
    );
  };
  const heading = (index: Step, description: string) => (
    <div className="wizard-step__heading">
      <h2 ref={(element) => { headings.current[index] = element; }} tabIndex={-1}>
        <small>{t(`Step ${index + 1} of 3`, `الخطوة ${index + 1} من 3`)}</small>
        {steps[index]}
      </h2>
      <p>{description}</p>
    </div>
  );
  const services: [GroupRequestService, IconName][] = [["both", "globe"], ["hotels", "building"], ["transport", "car"]];
  const values = getValues();
  const date = (value: string) => (value ? formatCalendarDate(value, locale) : "—");
  const review = (title: string, editLabel: string, target: Step, rows: [string, ReactNode][]) => (
    <section className="wizard-review__card">
      <div className="wizard-review__head">
        <h3>{title}</h3>
        <button type="button" className="wizard-edit" aria-label={editLabel} onClick={() => goTo(target)}><Icon name="pencil" />{t("Edit", "تعديل")}</button>
      </div>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  );

  return (
    <div className="group-wizard" ref={wizard}>
      <ol className="wizard-progress" aria-label={t("Group quotation steps", "خطوات عرض سعر المجموعة")}>
        {steps.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          const marker = <><span className="wizard-progress__marker" aria-hidden="true">{state === "done" ? <Icon name="check" /> : index + 1}</span><span className="wizard-progress__label">{label}</span></>;
          return (
            <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              {state === "done" ? <button type="button" onClick={() => goTo(index as Step)}>{marker}</button> : <span className="wizard-progress__item">{marker}</span>}
            </li>
          );
        })}
      </ol>

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- only guards Enter from fields inside the form. */}
      <form
        noValidate
        className="wizard-card"
        onKeyDown={guardEnter}
        onChange={() => onPreviewChange(false)}
        onSubmit={handleSubmit(async () => { await Promise.resolve(); onPreviewChange(true); }, () => onPreviewChange(false))}
      >
        <p className="wizard-notice">{t("This form prepares a local preview only. It does not send your message.", "يجهز هذا النموذج معاينة محلية فقط، ولا يرسل رسالتك.")}</p>

        <div className="wizard-step" hidden={step !== 0}>
          {heading(0, t("Where is your group going, and when?", "إلى أين ستسافر مجموعتك ومتى؟"))}
          <div className="wizard-fields">
            <div className="wizard-span">{text("destination", t("Destination / route", "الوجهة / المسار"), { icon: "pin", required: true })}</div>
            {text("start", t("Departure date", "تاريخ المغادرة"), { type: "date", required: true })}
            {text("end", t("End date", "تاريخ النهاية"), { type: "date", required: true })}
            {count("passengers", t("Passengers", "المسافرون"), true)}
            {count("rooms", t("Rooms needed (optional)", "الغرف المطلوبة (اختياري)"), false)}
            <fieldset className="wizard-span wizard-services">
              <legend>{t("Requested services", "الخدمات المطلوبة")}</legend>
              <div>
                {services.map(([value, icon]) => (
                  <label key={value}>
                    <input type="radio" value={value} {...register("service")} />
                    <Icon name={icon} />
                    {serviceLabel(value)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="wizard-step" hidden={step !== 1}>
          {heading(1, t("Who should this request be prepared for?", "لمن يتم تجهيز هذا الطلب؟"))}
          <div className="wizard-fields">
            {text("name", t("Name", "الاسم"), { icon: "user", required: true, autoComplete: "name" })}
            {text("email", t("Email", "البريد الإلكتروني"), { icon: "mail", type: "email", required: true, autoComplete: "email" })}
            {text("agency", t("Agency / company", "الوكالة / الشركة"), { icon: "building", required: true, autoComplete: "organization" })}
            {text("subject", t("Subject", "الموضوع"), { icon: "document", required: true })}
            <div className="wizard-span">
              <FormField id="enquiry-message" label={t("Message / requirements", "الرسالة / المتطلبات")} required error={errors.message?.message}>
                <textarea id="enquiry-message" className="input" rows={4} required maxLength={2000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "enquiry-message-error" : undefined} {...register("message")} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="wizard-step" hidden={step !== 2}>
          {heading(2, t("Check the details, then prepare your preview.", "راجع التفاصيل ثم جهز المعاينة."))}
          {step === 2 && (
            <div className="wizard-review">
              {review(t("Trip", "الرحلة"), t("Edit trip details", "تعديل تفاصيل الرحلة"), 0, [
                [t("Destination / route", "الوجهة / المسار"), values.destination],
                [t("Travel dates", "تواريخ السفر"), <>{date(values.start)} – {date(values.end)}</>],
                [t("Passengers", "المسافرون"), values.passengers],
                [t("Rooms needed", "الغرف المطلوبة"), values.rooms || t("Not specified", "غير محدد")],
                [t("Requested services", "الخدمات المطلوبة"), serviceLabel(values.service)],
              ])}
              {review(t("Agency and contact", "الوكالة والتواصل"), t("Edit contact details", "تعديل بيانات التواصل"), 1, [
                [t("Name", "الاسم"), values.name],
                [t("Email", "البريد الإلكتروني"), <bdi key="email">{values.email}</bdi>],
                [t("Agency / company", "الوكالة / الشركة"), values.agency],
                [t("Subject", "الموضوع"), values.subject],
              ])}
              <section className="wizard-review__card wizard-span">
                <div className="wizard-review__head">
                  <h3>{t("Message / requirements", "الرسالة / المتطلبات")}</h3>
                  <button type="button" className="wizard-edit" aria-label={t("Edit message", "تعديل الرسالة")} onClick={() => goTo(1)}><Icon name="pencil" />{t("Edit", "تعديل")}</button>
                </div>
                <p className="wizard-review__message" dir="auto">{values.message}</p>
              </section>
            </div>
          )}
        </div>

        <div className="wizard-actions">
          {step > 0 && <button type="button" className="button button--outline" onClick={() => goTo((step - 1) as Step)}><Icon name="back" />{t("Back", "رجوع")}</button>}
          {step < 2 && <button type="button" className="button button--primary" onClick={() => void next()}>{t("Next step", "الخطوة التالية")}<Icon name="arrowRight" /></button>}
          {step === 2 && <button type="submit" className="button button--primary" disabled={isSubmitting}>{isSubmitting ? t("Preparing preview…", "تجهيز المعاينة…") : t("Preview request", "معاينة الطلب")}</button>}
        </div>

        {preview && step === 2 && (
          <section className="wizard-preview" role="status">
            <h2>{t("Local preview ready — not sent", "المعاينة المحلية جاهزة — لم تُرسل")}</h2>
            <p>{t("Delivery is unavailable until an approved contact service is connected. No response time or price is promised.", "الإرسال غير متاح حتى ربط خدمة تواصل معتمدة. لا يوجد وعد بمدة رد أو سعر.")}</p>
            <button type="button" className="button button--primary" onClick={onSave}>{t("Save demo request", "حفظ الطلب التجريبي")}</button>
            <p>{t("Saves a demo record in this browser session so you can track it in My Group Requests. It is not sent to Royal Vacation.", "يحفظ سجلًا تجريبيًا في جلسة المتصفح هذه لتتابعه في طلبات مجموعاتي. لا يُرسل إلى رويال فاكيشن.")}</p>
          </section>
        )}
      </form>

      <aside className="wizard-help" aria-label={t("For travel professionals", "لمحترفي السفر")}>
        <div>
          <h2>{t("For travel professionals", "لمحترفي السفر")}</h2>
          <p>{t("Include your destination, travel dates and service requirements. Please do not enter payment details or identity documents.", "اذكر الوجهة وتواريخ السفر والخدمات المطلوبة. لا تدخل بيانات دفع أو مستندات هوية.")}</p>
        </div>
        <nav aria-label={t("Related pages", "صفحات ذات صلة")}>
          <Link to="/group-requests">{t("My Group Requests", "طلبات مجموعاتي")}</Link>
          <Link to="/contact">{t("General agency enquiry", "استفسار عام للوكالة")}</Link>
          <Link to="/search">{t("Explore hotels", "استكشف الفنادق")}</Link>
          <Link to="/car-rental">{t("Explore car rentals", "استكشف تأجير السيارات")}</Link>
        </nav>
      </aside>
    </div>
  );
}
