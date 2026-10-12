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
    />
  );
}
