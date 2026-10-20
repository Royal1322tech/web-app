import type { ImgHTMLAttributes } from "react";
import sources from "@/generated/image-sources.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt: string;
  eager?: boolean;
};

export function ResponsiveImage({
  src,
  alt,
  eager = false,
  loading,
  decoding = "async",
  onError,
  ...props
}: Props) {
  const srcSet = (sources as Record<string, string>)[src];
  return (
    <img
      {...props}
      src={src}
      srcSet={srcSet}
      alt={alt}
      loading={loading ?? (eager ? "eager" : "lazy")}
      fetchPriority={eager ? "high" : "auto"}
      decoding={decoding}
      onError={(event) => {
        onError?.(event);
        const image = event.currentTarget;
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = "true";
        image.removeAttribute("srcset");
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23edf2f4'/%3E%3Cpath d='M280 385h240l-55-75-45 53-38-44z' fill='%23b8c9ce'/%3E%3Ccircle cx='500' cy='240' r='28' fill='%23c8d7db'/%3E%3C/svg%3E";
      }}
    />
  );
}
