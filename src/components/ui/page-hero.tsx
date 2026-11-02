import type { ReactNode } from "react";
import { ResponsiveImage } from "./responsive-image";

/** The shared photo header for content pages: one image treatment, overlay and type scale. */
export function PageHero({ eyebrow, title, children, image, position = "center" }: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  image: { src: string; width: number; height: number };
  position?: string;
}) {
  return (
    <header className="page-hero">
      <ResponsiveImage className="page-hero__image" src={image.src} alt="" width={image.width} height={image.height} sizes="100vw" eager style={{ objectPosition: position }} />
      <div className="page-hero__copy">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {children && <span>{children}</span>}
      </div>
    </header>
  );
}
