import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { useRef, useState } from "react";
import { useLocale } from "@/features/localization/locale-provider";
import type { HotelListing } from "../types";
import { FavouriteButton } from "./hotel-result-card";
import styles from "../hotels.module.css";
export function HotelGallery({ hotel }: { hotel: HotelListing }) {
  const { locale, t } = useLocale();
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = hotel.photos[index];
  function step(direction: number) {
    setIndex(
      (i) => (i + direction + hotel.photos.length) % hotel.photos.length,
    );
  }
  return (
    <>
      <div className={styles.gallery}>
        <div className={styles.mainPhoto}>
          <button
            onClick={() => {
              setIndex(0);
              dialog.current?.showModal();
            }}
            aria-label={t("Open photo gallery", "افتح معرض الصور")}
          >
            <Image
              src={hotel.photos[0].src}
              alt={hotel.photos[0].label[locale]}
              width={hotel.photos[0].width}
              height={hotel.photos[0].height}
              sizes="(max-width: 599px) calc(100vw - 36px), (max-width: 999px) 56vw, (max-width: 1439px) 54vw, 770px"
              eager
            />
            <span>1/{hotel.photos.length}</span>
          </button>
          <FavouriteButton hotel={hotel} />
        </div>
        <div className={styles.galleryThumbs}>
          {hotel.photos.slice(1).map((p, i) => (
            <button
              key={p.src}
              onClick={() => {
                setIndex(i + 1);
                dialog.current?.showModal();
              }}
              aria-label={p.label[locale]}
            >
              <Image
                src={p.src}
                alt={p.label[locale]}
                width={p.width}
                height={p.height}
                sizes="(max-width: 599px) calc(50vw - 24px), (max-width: 999px) 19vw, (max-width: 1439px) 18vw, 270px"
                style={{ maxWidth: p.width, maxHeight: p.height }}
              />
              {i === hotel.photos.length - 2 && (
                <span className={styles.allPhotos}>
                  {t("See All Photos", "عرض كل الصور")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label={t("Hotel photo gallery", "معرض صور الفندق")}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(locale === "ar" ? -1 : 1);
          if (e.key === "ArrowLeft") step(locale === "ar" ? 1 : -1);
        }}
      >
        <div className={styles.listHeader}>
          <h2>{photo.label[locale]}</h2>
          <button
            className={styles.secondary}
            onClick={() => dialog.current?.close()}
          >
            {t("Close", "إغلاق")}
          </button>
        </div>
        <Image
          className={styles.galleryFull}
          src={photo.src}
          alt={photo.label[locale]}
          width={photo.width}
          height={photo.height}
          sizes={`(max-width: 899px) min(90vw, ${photo.width}px), ${Math.min(photo.width, 850)}px`}
          style={{ maxWidth: `min(100%, ${photo.width}px)` }}
        />
        <div className={styles.listHeader}>
          <button className={styles.secondary} onClick={() => step(-1)}>
            {t("Previous photo", "الصورة السابقة")}
          </button>
          <p aria-live="polite">
            {index + 1} / {hotel.photos.length}
          </p>
          <button className={styles.secondary} onClick={() => step(1)}>
            {t("Next photo", "الصورة التالية")}
          </button>
        </div>
      </dialog>
    </>
  );
}
