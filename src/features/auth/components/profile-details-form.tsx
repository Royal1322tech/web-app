import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { updateCurrentUser } from "../b2b-auth-api";
import { b2bSession, useB2BSession } from "../b2b-session";

const PHONE = /^\+?[0-9][0-9 ()-]{5,28}$/;

type Errors = { name?: string; phone?: string };
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

/**
 * The signed-in user's own name and phone, saved with PATCH /api/v1/b2b/me. The API accepts only these
 * two fields and at least one of them; company details stay read-only. Only changed fields are sent,
 * and the profile is reloaded from GET /me after a save. Real sign-in builds only.
 */
export function ProfileDetailsForm() {
  const { t } = useLocale();
  const session = useB2BSession();
  const user = session.status === "active" ? session.identity.user : null;
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const titleId = useId();
  if (!user) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !user) return;
    const nextName = name.trim();
    const nextPhone = phone.trim();
    const found: Errors = {};
    if (!nextName) found.name = t("Enter your name.", "أدخل اسمك.");
    else if (nextName.length > 255) found.name = t("Use 255 characters or fewer.", "استخدم 255 حرفًا أو أقل.");
    if (nextPhone && !PHONE.test(nextPhone)) found.phone = t("Enter a valid phone number, for example +20 100 123 4567.", "أدخل رقم هاتف صحيحًا، مثل ‎+20 100 123 4567.");
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return;
    const changes: { name?: string; phone?: string } = {};
    if (nextName !== user.name) changes.name = nextName;
    if (nextPhone && nextPhone !== (user.phone ?? "")) changes.phone = nextPhone;
    if (!Object.keys(changes).length) {
      setNotice({ tone: "info", text: t("There are no changes to save.", "لا توجد تغييرات لحفظها.") });
      return;
    }
    const token = b2bSession.token();
    if (!token) return;
    pending.current = true;
    setBusy(true);
    try {
      await updateCurrentUser(token, changes);
      await b2bSession.reloadIdentity();
      setNotice({ tone: "success", text: t("Your details were saved.", "تم حفظ بياناتك.") });
    } catch (failure) {
      if (failure instanceof ApiError && failure.kind === "validation") {
        const fields = failure.fieldErrors;
        const next: Errors = {};
        if (fields.name) next.name = t("Check your name.", "تحقق من اسمك.");
        if (fields.phone) next.phone = t("Check the phone number.", "تحقق من رقم الهاتف.");
        setErrors(next);
        if (!next.name && !next.phone) setNotice({ tone: "error", text: t("These details weren't accepted. Check them and try again.", "لم يتم قبول هذه البيانات. تحقق منها وحاول مرة أخرى.") });
      } else if (failure instanceof ApiError && failure.kind === "rate_limited") {
        setNotice({ tone: "error", text: t("Too many requests. Please wait a few minutes before trying again.", "طلبات كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.") });
      } else if (failure instanceof ApiError && failure.kind === "forbidden") {
        setNotice({ tone: "error", text: t("Your account can't change these details.", "لا يمكن لحسابك تغيير هذه البيانات.") });
      } else if (failure instanceof ApiError && (failure.kind === "network" || failure.kind === "timeout")) {
        setNotice({ tone: "error", text: t("We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى.") });
      } else {
        // 401 ends the session through the shared API client; anything else is unexpected.
        setNotice({ tone: "error", text: t("Your details couldn't be saved. Please try again later.", "تعذر حفظ بياناتك. يرجى المحاولة لاحقًا.") });
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="workspace-card profile-details-form" aria-labelledby={titleId} data-profile-form>
      <h2 id={titleId} className="profile-card-title">{t("Your details", "بياناتك")}</h2>
      <p className="fine-print">{t("Your name and phone number. Company details can't be changed online; contact Royal Vacation to update them.", "اسمك ورقم هاتفك. لا يمكن تغيير بيانات الشركة عبر الإنترنت؛ تواصل مع رويال فاكيشن لتحديثها.")}</p>
      <form noValidate onSubmit={save} aria-busy={busy}>
        <FormField id="profile-name" label={t("Full name", "الاسم الكامل")} error={errors.name}>
          <Input id="profile-name" name="name" autoComplete="name" value={name} disabled={busy} required aria-invalid={!!errors.name} aria-describedby={errors.name ? "profile-name-error" : undefined}
            onChange={(event) => { setName(event.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }} />
        </FormField>
        <FormField id="profile-phone" label={t("Phone", "الهاتف")} error={errors.phone}>
          <Input id="profile-phone" name="phone" type="tel" autoComplete="tel" dir="ltr" value={phone} disabled={busy} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "profile-phone-error" : undefined}
            onChange={(event) => { setPhone(event.target.value); if (errors.phone) setErrors({ ...errors, phone: undefined }); }} />
        </FormField>
        <Button type="submit" disabled={busy}>{busy ? t("Saving…", "جارٍ الحفظ…") : t("Save changes", "حفظ التغييرات")}</Button>
        <div role={notice?.tone === "error" ? "alert" : "status"}>
          {notice && <p className={notice.tone === "error" ? "availability-notice" : "fine-print"} data-profile-notice={notice.tone}>{notice.text}</p>}
        </div>
      </form>
    </section>
  );
}
