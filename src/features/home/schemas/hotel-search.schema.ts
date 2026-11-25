import { isCalendarDay, toLocalDay } from "@/lib/stay-dates";
import { countries } from "@/features/agency-registration/data/countries";
import { z } from "zod";
import { searchLimits } from "../data/search-limits";

export const roomSchema = z.object({
  adults: z
    .number()
    .int()
    .min(searchLimits.minAdults)
    .max(searchLimits.maxAdultsPerRoom),
  childAges: z
    .array(
      z
        .number()
        .int()
        .min(searchLimits.minChildAge)
        .max(searchLimits.maxChildAge)
        .nullable()
        .refine((age) => age !== null, "Select this child's age."),
    )
    .max(searchLimits.maxChildrenPerRoom),
});

const dateSchema = z
  .string()
  .min(1, "Choose a date.")
  .refine(
    (value) => z.iso.date().safeParse(value).success && isCalendarDay(value),
    "Choose a valid date.",
  );

/** Today's local calendar day, read when the form is validated (never a fixed date). */
export function localToday() {
  return toLocalDay(new Date());
}

export const hotelSearchSchema = z
  .object({
    nationality: z.string().refine(value => countries.some(country => country.value === value), "Select a nationality.").optional(),
    destination: z.string().trim().min(1, "Select a destination."),
    checkIn: dateSchema,
    checkOut: dateSchema,
    rooms: z.array(roomSchema).min(1).max(searchLimits.maxRooms),
  })
  .superRefine((values, context) => {
    if (values.checkIn && values.checkIn < localToday())
      context.addIssue({
        code: "custom",
        path: ["checkIn"],
        message: "Check-in cannot be in the past.",
      });
    if (values.checkIn && values.checkOut && values.checkOut <= values.checkIn)
      context.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "Check-out must be after check-in.",
      });
  });

export type HotelSearchCriteria = z.infer<typeof hotelSearchSchema>;
export type HotelSearchFormValues = z.input<typeof hotelSearchSchema>;
export type RoomValues = z.input<typeof roomSchema>;
export const createRoom = (): RoomValues => ({ adults: 2, childAges: [] });
