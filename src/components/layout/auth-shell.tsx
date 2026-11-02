import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function AuthShell({
  variant,
  children,
  language = "en",
  backHref = "/welcome",
  backLabel = "Back to welcome",
}: {
  variant: "welcome" | "login";
  children: ReactNode;
  language?: "en" | "ar";
  backHref?: string;
  backLabel?: string;
}) {
  const isLogin = variant === "login";
  return (
    <main
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`auth-page auth-page--${variant}`}
    >
      <div className="auth-panel">
        <Image
          src={
            isLogin ? "/images/login-travel.png" : "/images/welcome/resort-aerial.jpg"
          }
          alt={
            language === "ar"
              ? isLogin
                ? "شرفة مشمسة تطل على البحر. اكتشف المزيد، وجهتك القادمة بانتظارك."
                : "منظر جوي لمنتجع ساحلي بمسبح لا متناهٍ يطل على البحر"
              : isLogin
                ? "Explore more. Your next destination awaits. A sunlit terrace overlooking the sea."
                : "Aerial view of a coastal resort with an infinity pool overlooking the sea"
          }
          width={isLogin ? 667 : 1600}
          height={isLogin ? 855 : 1067}
          sizes={
            isLogin
              ? "(max-width: 640px) 1px, (max-width: 1100px) 45vw, 560px"
              : "(max-width: 800px) 100vw, 1440px"
          }
          eager
          className="travel-image"
        />
      </div>
      {isLogin && (
        <Link
          to={backHref}
          className="back-link auth-back"
          aria-label={backLabel}
        >
          <span
            style={{
              display: "inline-flex",
              transform: language === "ar" ? "scaleX(-1)" : undefined,
            }}
          >
            <Icon name="back" />
          </span>
        </Link>
      )}
      <div className="auth-content">{children}</div>
    </main>
  );
}
