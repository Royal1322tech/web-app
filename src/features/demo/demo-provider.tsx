import { demoAuth, subscribeDemoSession } from "@/features/auth/demo-auth";
import {
  rentalTotal,
  rentalSchema,
  demoVehicles,
  type RentalSelection,
  type RentalDriver,
  type RentalRecord,
  type RentalStatus,
} from "@/features/car-rental/rental-model";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { localToday } from "@/features/home/schemas/hotel-search.schema";
import { samplePriceBreakdown } from "@/features/hotels/lib/sample-stay";
import { demoProfile, demoNotifications, initialBookings } from "./fixtures";
import type {
  DemoSelection,
  DemoBooking,
  GuestValues,
  DemoStatus,
  AgencyProfile,
  DemoNotification,
} from "./types";
interface DemoContextValue {
  rentalSelection: RentalSelection | null;
  rentalDriver: RentalDriver | null;
  rentals: RentalRecord[];
  selectRental: (selection: RentalSelection) => void;
  saveRentalDriver: (driver: RentalDriver) => void;
  createRental: (status: Exclude<RentalStatus, "cancelled">) => string | null;
  cancelRental: (id: string) => void;
  modifyRental: (id: string, selection: RentalSelection) => void;
  demoSessionActive: boolean;
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
  selection: DemoSelection | null;
  guests: GuestValues | null;
  records: DemoBooking[];
  profile: AgencyProfile;
  notifications: DemoNotification[];
  selectRoom: (selection: DemoSelection) => void;
  updateCriteria: (criteria: HotelSearchCriteria) => void;
  saveGuests: (guests: GuestValues) => void;
  createBooking: (status: Exclude<DemoStatus, "cancelled">) => string | null;
  cancelBooking: (id: string) => void;
  modifyBooking: (
    id: string,
    criteria: HotelSearchCriteria,
    requests: string,
  ) => void;
  saveProfile: (profile: AgencyProfile) => void;
  readNotification: (id?: string) => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);
export function totalFor(selection: DemoSelection) {
  return (
    samplePriceBreakdown(selection.rate.nightlyRate, selection.criteria).total *
    selection.criteria.rooms.length
  );
}
export function defaultCriteria(destination: string): HotelSearchCriteria {
  const start = new Date(`${localToday()}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 3);
  return {
    destination,
    checkIn: start.toISOString().slice(0, 10),
    checkOut: end.toISOString().slice(0, 10),
    rooms: [{ adults: 2, childAges: [] }],
  };
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const demoSessionActive = useSyncExternalStore(subscribeDemoSession, demoAuth.isActive, () => false);
  const [rentalSelection, setRentalSelection] =
    useState<RentalSelection | null>(null);
  const [rentalDriver, setRentalDriver] = useState<RentalDriver | null>(null);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [selection, setSelection] = useState<DemoSelection | null>(null);
  const [guests, setGuests] = useState<GuestValues | null>(null);
  const [records, setRecords] = useState(initialBookings);
  const [profile, setProfile] = useState(demoProfile);
  const [notifications, setNotifications] = useState(demoNotifications);
  const value: DemoContextValue = {
    rentalSelection,
    rentalDriver,
    rentals,
    selectRental: (next) => {
      if (
        !rentalSchema.safeParse(next.criteria).success ||
        !demoVehicles.some((v) => v.id === next.vehicleId && v.available)
      )
        return;
      setRentalSelection(next);
      setRentalDriver(null);
    },
    saveRentalDriver: setRentalDriver,
    createRental: (status) => {
      if (!rentalSelection || !rentalDriver) return null;
      const id = `RENTAL-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      setRentals((current) => [
        {
          ...rentalSelection,
          id,
          driver: rentalDriver,
          status,
          total: rentalTotal(rentalSelection),
          timeline: [`Demo ${status}`],
        },
        ...current,
      ]);
      setRentalSelection(null);
      setRentalDriver(null);
      return id;
    },
    cancelRental: (id) =>
      setRentals((current) =>
        current.map((r) =>
          r.id === id && ["confirmed", "pending"].includes(r.status)
            ? {
                ...r,
                status: "cancelled",
                timeline: [
                  ...r.timeline,
                  "Cancellation simulated — no supplier change",
                ],
              }
            : r,
        ),
      ),
    modifyRental: (id, selection) => {
      if (!rentalSchema.safeParse(selection.criteria).success) return;
      setRentals((current) =>
        current.map((r) =>
          r.id === id &&
          r.vehicleId === selection.vehicleId &&
          ["confirmed", "pending"].includes(r.status)
            ? {
                ...r,
                ...selection,
                total: rentalTotal(selection),
                timeline: [
                  ...r.timeline,
                  "Modification simulated — no supplier change",
                ],
              }
            : r,
        ),
      );
    },
    demoSessionActive,
    signIn: demoAuth.signIn,
    signOut: () => {
      demoAuth.signOut();
      setRentalSelection(null);
      setRentalDriver(null);
      setRentals([]);
      setSelection(null);
      setGuests(null);
      setRecords(initialBookings());
      setProfile(demoProfile);
      setNotifications(demoNotifications);
    },
    selection,
    guests,
    records,
    profile,
    notifications,
    selectRoom: (next) => {
      setSelection(next);
      setGuests(null);
    },
    updateCriteria: (criteria) => {
      setSelection((s) => (s ? { ...s, criteria } : null));
      setGuests(null);
    },
    saveGuests: setGuests,
    createBooking: (status) => {
      if (!selection || !guests) return null;
      const id = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const at = new Date().toISOString();
      const record: DemoBooking = {
        id,
        hotelId: selection.hotelId,
        status,
        bookedAt: localToday(),
        checkIn: selection.criteria.checkIn,
        checkOut: selection.criteria.checkOut,
        traveller: guests.leadName,
        owner: "mine",
        agencyReference: guests.reference || id,
        cancellationFee: false,
        selection,
        guests,
        total: totalFor(selection),
        timeline: [
          { label: "Demo request created", at },
          { label: `Demo ${status}`, at },
        ],
      };
      setRecords((current) => [record, ...current]);
      setNotifications((current) => [
        {
          id,
          title: `${id} · ${status}`,
          description:
            "A local booking simulation was created. No supplier reservation or payment occurred.",
          href: `/bookings/${id}`,
          read: false,
        },
        ...current,
      ]);
      setSelection(null);
      setGuests(null);
      return id;
    },
    cancelBooking: (id) =>
      setRecords((current) =>
        current.map((b) =>
          b.id === id && ["pending", "confirmed"].includes(b.status)
            ? {
                ...b,
                status: "cancelled",
                timeline: [
                  ...b.timeline,
                  {
                    label: "Cancellation simulated — supplier unchanged",
                    at: new Date().toISOString(),
                  },
                ],
              }
            : b,
        ),
      ),
    modifyBooking: (id, criteria, requests) =>
      setRecords((current) =>
        current.map((b) =>
          b.id === id && ["pending", "confirmed"].includes(b.status)
            ? {
                ...b,
                checkIn: criteria.checkIn,
                checkOut: criteria.checkOut,
                selection: { ...b.selection, criteria },
                guests: { ...b.guests, requests },
                total: totalFor({ ...b.selection, criteria }),
                timeline: [
                  ...b.timeline,
                  {
                    label: "Stay modification simulated — supplier unchanged",
                    at: new Date().toISOString(),
                  },
                ],
              }
            : b,
        ),
      ),
    saveProfile: setProfile,
    readNotification: (id) =>
      setNotifications((current) =>
        current.map((n) => (!id || n.id === id ? { ...n, read: true } : n)),
      ),
  };
  return <DemoContext value={value}>{children}</DemoContext>;
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}
