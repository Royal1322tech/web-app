import { useEffect, useRef } from "react";

/** Shows a selected logo. Each object URL lasts only as long as this file is on screen. */
export function CompanyLogoPreview({ file, alt, className }: { file: File; alt: string; className?: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img ref={image} alt={alt} className={className} />;
}
