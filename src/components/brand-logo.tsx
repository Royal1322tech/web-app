import { ResponsiveImage as Image } from "@/components/ui/responsive-image";

export function BrandLogo({ withName = false }: { withName?: boolean }) {
  return (
    <div className={`brand-logo${withName ? " brand-logo--with-name" : ""}`}>
      <Image
        src="/images/royal-vacation-logo.png"
        alt="Royal Vacation"
        width={199}
        height={202}
        eager
      />
      {withName && <span aria-hidden="true">Royal Vacation</span>}
    </div>
  );
}
