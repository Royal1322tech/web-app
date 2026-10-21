import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { LoginForm } from "./components/login-form";
import { PublicLandingHeader } from "./public-landing-header";
import { ProductsServices, PlatformStrengths } from "@/features/home/components/platform-sections";
import { SiteFooter } from "@/features/home/components/site-footer";
import styles from "./public-landing-page.module.css";

export function PublicLandingPage() {
  const { t, locale } = useLocale();

  return (
    <div className={styles.page} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <a className={styles.skip} href="#login">{t("Skip to sign in", "انتقل إلى تسجيل الدخول")}</a>
      <PublicLandingHeader />

      <main>
        <section className={styles.hero} aria-labelledby="login-title">
          <section className={styles.loginCard} id="login" aria-labelledby="login-title">
            <p className={styles.cardEyebrow}>{t("AGENCY WORKSPACE", "مساحة الوكالات")}</p>
            <h1 id="login-title">{t("Login to your account", "تسجيل الدخول إلى حسابك")}</h1>
            <p>{t("Access your Royal Vacation workspace.", "ادخل إلى مساحة عمل رويال فاكيشن.")}</p>
            <LoginForm />
          </section>
        </section>

        <section className={styles.videoSection} aria-labelledby="video-title">
          <div className={styles.videoCopy}>
            <p className={styles.eyebrow}>{t("MEET ROYAL VACATION", "تعرف على رويال فاكيشن")}</p>
            <h2 id="video-title">{t("A closer look at the journeys we help plan", "نظرة أقرب على الرحلات التي نساعد في تخطيطها")}</h2>
            <p>{t("See our travel services and the Royal Vacation experience in this short introduction.", "شاهد خدمات السفر وتجربة رويال فاكيشن في هذا العرض القصير.")}</p>
          </div>
          <video className={styles.video} controls playsInline preload="none" poster="/videos/royal-promo-poster.jpg" aria-label={t("Royal Vacation promotional video", "الفيديو التعريفي برويال فاكيشن")}>
            <source src="/videos/royal-promo.mp4" type="video/mp4" />
            <track kind="captions" src={locale === "ar" ? "/videos/royal-promo.ar.vtt" : "/videos/royal-promo.en.vtt"} srcLang={locale} label={locale === "ar" ? "العربية" : "English"} default />
            {t("Your browser does not support this video.", "متصفحك لا يدعم تشغيل هذا الفيديو.")}
          </video>
        </section>

        <ProductsServices publicLanding />

        <section className={styles.partnerCta} aria-labelledby="partner-cta-title">
          <div>
            <p className={styles.eyebrow}>{t("PARTNER WITH ROYAL VACATION", "كن شريكًا لرويال فاكيشن")}</p>
            <h2 id="partner-cta-title">{t("Grow with Royal Vacation", "انمُ مع رويال فاكيشن")}</h2>
            <p>{t("Create an agency profile and explore the partner workspace. Registration is currently a local preview.", "أنشئ ملف وكالة واستكشف مساحة الشركاء. التسجيل حاليًا معاينة محلية.")}</p>
          </div>
          <div className={styles.ctaActions}>
            <Link to="/register/agency/company">{t("Register your agency", "سجل وكالتك")}<Icon name="arrowRight" /></Link>
            <Link to="/contact">{t("Contact Us", "تواصل معنا")}</Link>
          </div>
        </section>

        <PlatformStrengths />
      </main>
      <SiteFooter />
    </div>
  );
}
