import { useFormContext, useWatch } from "react-hook-form";
import { searchLimits } from "../data/search-limits";
import type { HotelSearchFormValues } from "../schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const { t } = useLocale();
  return (
    <div className={styles.counter}>
      <button
        type="button"
        aria-label={`${t("Decrease", "تقليل")} ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-label={label} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        aria-label={`${t("Increase", "زيادة")} ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function RoomEditor({
  index,
  removable,
  onRemove,
}: {
  index: number;
  removable: boolean;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<HotelSearchFormValues>();
  const room = useWatch({ control, name: `rooms.${index}` });
  const roomErrors = errors.rooms?.[index];
  const roomLabel = `${t("Room", "غرفة")} ${index + 1}`;
  return (
    <fieldset className={styles.roomEditor}>
      <legend>{roomLabel}</legend>
      {removable && (
        <button
          type="button"
          className={styles.removeRoom}
          onClick={onRemove}
          aria-label={`${t("Remove")} ${roomLabel}`}
        >
          {t("Remove")}
        </button>
      )}
      <div className={styles.roomCounters}>
        <div>
          <span>{t("Adults")}</span>
          <Counter
            label={`${t("adults in", "البالغين في")} ${roomLabel}`}
            value={room.adults}
            min={searchLimits.minAdults}
            max={searchLimits.maxAdultsPerRoom}
            onChange={(value) =>
              setValue(`rooms.${index}.adults`, value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </div>
        <div>
          <span>
            {t("Children")}{" "}
            <small>
              {searchLimits.minChildAge}–{searchLimits.maxChildAge}{" "}
              {t("years", "سنة")}
            </small>
          </span>
          <Counter
            label={`${t("children in", "الأطفال في")} ${roomLabel}`}
            value={room.childAges.length}
            min={0}
            max={searchLimits.maxChildrenPerRoom}
            onChange={(count) =>
              setValue(
                `rooms.${index}.childAges`,
                count > room.childAges.length
                  ? [...room.childAges, null]
                  : room.childAges.slice(0, count),
                { shouldDirty: true },
              )
            }
          />
        </div>
      </div>
      {room.childAges.length > 0 && (
        <div className={styles.childAges}>
          <p>{t("Age of children at check-in")}</p>
          {room.childAges.map((_, childIndex) => {
            const id = `room-${index}-child-${childIndex}`;
            const error = roomErrors?.childAges?.[childIndex]?.message;
            return (
              <div key={id}>
                <label htmlFor={id}>
                  {t(
                    `Child ${childIndex + 1} age`,
                    `عمر الطفل ${childIndex + 1}`,
                  )}
                </label>
                <select
                  id={id}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${id}-error` : undefined}
                  {...register(`rooms.${index}.childAges.${childIndex}`, {
                    setValueAs: (value) =>
                      value === "" || value == null ? null : Number(value),
                  })}
                >
                  <option value="">{t("Age")}</option>
                  {Array.from(
                    {
                      length:
                        searchLimits.maxChildAge - searchLimits.minChildAge + 1,
                    },
                    (_, age) => (
                      <option key={age} value={age + searchLimits.minChildAge}>
                        {age + searchLimits.minChildAge}
                      </option>
                    ),
                  )}
                </select>
                {error && (
                  <p className={styles.error} id={`${id}-error`} role="alert">
                    {t(error)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
