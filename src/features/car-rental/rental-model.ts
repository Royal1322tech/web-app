import { z } from "zod";
import { localToday } from "@/features/home/schemas/hotel-search.schema";
export const rentalLocations = ["Cairo", "Alexandria", "Hurghada"] as const;
export const rentalSchema = z
  .object({
    pickup: z.enum(rentalLocations),
    dropoff: z.enum(rentalLocations),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((v, ctx) => {
    const validDate = (date: string) =>
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(v.start) || v.start < localToday())
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "Choose today or a future pickup date.",
      });
    if (!validDate(v.end) || v.end <= v.start)
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Return must be after pickup.",
      });
  });
export type RentalCriteria = z.infer<typeof rentalSchema>;
export const driverSchema = z.object({
  requests: z.string().max(500).optional(),
  name: z.string().trim().min(2, "Enter a fictional driver name."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number."),
  acknowledged: z
    .boolean()
    .refine(Boolean, "Confirm that these are fictional details."),
});
export type RentalDriver = z.infer<typeof driverSchema>;
export interface DemoVehicle {
  id: string;
  name: { en: string; ar: string };
  category: "economy" | "suv" | "van";
  transmission: "automatic" | "manual";
  seats: number;
  bags: number;
  daily: number;
  available: boolean;
}
// Entirely fictional examples; no supplier stock, actual models or live prices.
export const demoVehicles: readonly DemoVehicle[] = [
  {
    id: "demo-city",
    name: { en: "City compact — sample", ar: "سيارة مدينة مدمجة — مثال" },
    category: "economy",
    transmission: "automatic",
    seats: 4,
    bags: 2,
    daily: 45,
    available: true,
  },
  {
    id: "demo-family",
    name: { en: "Family SUV — sample", ar: "سيارة عائلية — مثال" },
    category: "suv",
    transmission: "automatic",
    seats: 5,
    bags: 3,
    daily: 75,
    available: true,
  },
  {
    id: "demo-group",
    name: { en: "Group van — sample", ar: "فان للمجموعات — مثال" },
    category: "van",
    transmission: "manual",
    seats: 7,
    bags: 4,
    daily: 95,
    available: false,
  },
];
export interface RentalSelection {
  vehicleId: string;
  criteria: RentalCriteria;
}
export type RentalStatus = "confirmed" | "pending" | "failed" | "cancelled";
export interface RentalRecord extends RentalSelection {
  id: string;
  /** Demo identity of the user who recorded the rental. */
  ownerId: string;
  driver: RentalDriver;
  status: RentalStatus;
  total: number;
  timeline: string[];
}
export function rentalDays(criteria: RentalCriteria) {
  return Math.round(
    (Date.parse(criteria.end) - Date.parse(criteria.start)) / 86400000,
  );
}
export function rentalTotal(selection: RentalSelection) {
  return (
    rentalDays(selection.criteria) *
    demoVehicles.find((v) => v.id === selection.vehicleId)!.daily
  );
}
export function defaultRentalCriteria(): RentalCriteria {
  const start = new Date(`${localToday()}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 3);
  return {
    pickup: "Cairo",
    dropoff: "Cairo",
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export function rentalQuery(criteria: RentalCriteria) {
  return new URLSearchParams(criteria).toString();
}
export function readRentalQuery(search: string) {
  return rentalSchema.safeParse(
    Object.fromEntries(new URLSearchParams(search)),
  );
}
