import { useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { searchLimits } from "../data/search-limits";
import {
  createRoom,
  type HotelSearchFormValues,
} from "../schemas/hotel-search.schema";
import { RoomEditor } from "./room-editor";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

export function RoomSelector() {
  const { t, locale } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const {
    control,
    trigger,
    formState: { errors },
  } = useFormContext<HotelSearchFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "rooms" });
  const rooms = useWatch({ control, name: "rooms" });
  const guests = rooms.reduce(
    (count, room) => count + room.adults + room.childAges.length,
    0,
  );

  function close() {
    dialogRef.current?.close();
  }
  async function apply() {
    if (await trigger("rooms", { shouldFocus: true })) close();
  }

  return (
    <div className={styles.guestField}>
      <span id="rooms-label" className={styles.fieldLabel}>
        <Icon name="people" />
        {t("Rooms & Guests")}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.guestTrigger}
        aria-labelledby="rooms-label guest-summary"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="room-selector"
        aria-describedby={errors.rooms ? "rooms-error" : undefined}
        onClick={(event) => {
          const dialog = dialogRef.current;
          if (!dialog) return;
          const anchor = event.currentTarget.getBoundingClientRect();
          dialog.style.setProperty(
            "--room-top",
            // Below the field when there's room for most of the panel; otherwise higher up so it stays usable.
            `${Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - 460))}px`,
          );
          dialog.style.setProperty(
            "--room-right",
            `${Math.max(16, locale === "ar" ? anchor.left : window.innerWidth - anchor.right)}px`,
          );
          dialog.showModal();
          setOpen(true);
        }}
      >
        <span id="guest-summary">
          {t(
            `${guests} ${guests === 1 ? "Guest" : "Guests"} in ${rooms.length} ${rooms.length === 1 ? "Room" : "Rooms"}`,
            `${guests} نزلاء في ${rooms.length} غرف`,
          )}
        </span>
        <Icon name="chevron" />
      </button>
      {errors.rooms && (
        <p id="rooms-error" className={styles.error}>
          {t("Check room details and select every child\u2019s age.")}
        </p>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- Native dialog handles Escape; backdrop click supplements the keyboard-accessible Close button. */}
      <dialog
        ref={dialogRef}
        id="room-selector"
        aria-labelledby="room-selector-title"
        className={styles.roomDialog}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <h2 id="room-selector-title">{t("Rooms & guests")}</h2>
            <button
              type="button"
              aria-label={t("Close room selector")}
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          {fields.map((field, index) => (
            <RoomEditor
              key={field.id}
              index={index}
              removable={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
          <div className={styles.roomActions}>
            <button
              type="button"
              disabled={fields.length >= searchLimits.maxRooms}
              onClick={() => append(createRoom())}
            >
              {t("\uff0b Add Room")}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void apply()}
            >
              {t("Apply")}
            </button>
          </div>
          <p className={styles.provisional}>
            {t(
              `Up to ${searchLimits.maxRooms} rooms, with up to ${searchLimits.maxAdultsPerRoom} adults and ${searchLimits.maxChildrenPerRoom} children in each room.`,
              `حتى ${searchLimits.maxRooms} غرف، وحتى ${searchLimits.maxAdultsPerRoom} بالغين و${searchLimits.maxChildrenPerRoom} أطفال في كل غرفة.`,
            )}
          </p>
        </div>
      </dialog>
    </div>
  );
}
