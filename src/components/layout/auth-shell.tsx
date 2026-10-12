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
            isLogin ? "/images/login-travel.png" : "/images/welcome-travel.png"
          }
          alt={
            language === "ar"
              ? "شرفة مشمسة تطل على البحر. اكتشف المزيد، وجهتك القادمة بانتظارك."
              : isLogin
                ? "Explore more. Your next destination awaits. A sunlit terrace overlooking the sea."
                : "A sunlit poolside terrace overlooking the Mediterranean Sea"
          }
          width={isLogin ? 667 : 565}
          height={isLogin ? 855 : 966}
          sizes="(max-width: 640px) 1px, (max-width: 1100px) 45vw, 560px"
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
