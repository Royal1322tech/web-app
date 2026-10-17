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
  PaymentMethod,
  AgencyProfile,
  DemoNotification,
} from "./types";
interface DemoContextValue {
  rentalPolicyAcknowledged: boolean;
  acknowledgeRentalPolicy: (accepted: boolean) => void;
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
  policyAcknowledged: boolean;
  paymentMethod: PaymentMethod | null;
  paymentDetailsPrepared: boolean;
  selectPaymentMethod: (method: PaymentMethod | null) => void;
  preparePaymentDetails: () => void;
  acknowledgePolicy: (accepted: boolean) => void;
  guests: GuestValues | null;
  records: DemoBooking[];
  profile: AgencyProfile;
  notifications: DemoNotification[];
  selectRoom: (selection: DemoSelection) => void;
  updateCriteria: (criteria: HotelSearchCriteria) => void;
  saveGuests: (guests: GuestValues) => void;
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
  const [rentalPolicyAcknowledged, setRentalPolicyAcknowledged] = useState(false);
  const [rentalDriver, setRentalDriver] = useState<RentalDriver | null>(null);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentDetailsPrepared, setPaymentDetailsPrepared] = useState(false);
  const [selection, setSelection] = useState<DemoSelection | null>(null);
  const [guests, setGuests] = useState<GuestValues | null>(null);
  const [records, setRecords] = useState(initialBookings);
  const [profile, setProfile] = useState(demoProfile);
  const [notifications, setNotifications] = useState(demoNotifications);
  const value: DemoContextValue = {
    rentalPolicyAcknowledged,
    acknowledgeRentalPolicy: setRentalPolicyAcknowledged,
    rentalSelection,
    rentalDriver,
    rentals,
    selectRental: (next) => {
      if (
        !rentalSchema.safeParse(next.criteria).success ||
        !demoVehicles.some((v) => v.id === next.vehicleId && v.available)
      )
        return;
      setRentalPolicyAcknowledged(false);
      setRentalSelection(next);
      setRentalDriver(null);
    },
    saveRentalDriver: driver => { setRentalDriver(driver); setRentalPolicyAcknowledged(false); },
    createRental: (status) => {
      if (!rentalSelection || !rentalDriver || !rentalPolicyAcknowledged) return null;
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
      setRentalPolicyAcknowledged(false);
      setSelection(null);
      setPolicyAcknowledged(false);
      setPaymentMethod(null);
      setPaymentDetailsPrepared(false);
      setGuests(null);
      setRecords(initialBookings());
      setProfile(demoProfile);
      setNotifications(demoNotifications);
    },
    selection,
    policyAcknowledged,
    acknowledgePolicy: setPolicyAcknowledged,
    paymentMethod,
    paymentDetailsPrepared,
    selectPaymentMethod: (method) => {
      if (method !== paymentMethod) setPaymentDetailsPrepared(false);
      setPaymentMethod(method);
    },
    preparePaymentDetails: () => setPaymentDetailsPrepared(true),
    guests,
    records,
    profile,
    notifications,
    selectRoom: (next) => {
      setSelection(next);
      setPolicyAcknowledged(false);
      setPaymentMethod(null);
      setPaymentDetailsPrepared(false);
      setGuests(null);
    },
    updateCriteria: (criteria) => {
      setPolicyAcknowledged(false);
      setPaymentMethod(null);
      setPaymentDetailsPrepared(false);
      setSelection((s) => (s ? { ...s, criteria } : null));
      setGuests(null);
    },
    saveGuests: setGuests,
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
