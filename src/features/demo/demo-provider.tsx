import { demoAuth, subscribeDemoSession } from "@/features/auth/demo-auth";
import { sampleGroupRequests } from "@/features/group-requests/group-requests.fixture";
import type { GroupRequest, NewGroupRequest } from "@/features/group-requests/group-request-types";
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
import { snapshotCancellationPolicy } from "./cancellation-assessment";
import { demoUserIds } from "@/features/auth/demo-auth";
import { sampleTickets } from "@/features/tickets/tickets.fixture";
import { findOwnedTicket, ownedTickets, resolveBookingAccess } from "@/features/tickets/ticket-access";
import type { NewTicketInput, SupportTicket } from "@/features/tickets/ticket-types";
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
  changeRoom: (selection: DemoSelection) => void;
  updateCriteria: (criteria: HotelSearchCriteria) => void;
  saveGuests: (guests: GuestValues) => void;
  cancelBooking: (id: string, cancelledAt?: string) => void;
  modifyBooking: (
    id: string,
    criteria: HotelSearchCriteria,
    requests: string,
  ) => void;
  saveProfile: (profile: AgencyProfile) => void;
  readNotification: (id?: string) => void;
  /** Demo identity of the signed-in user, used for ownership checks. */
  currentUserId: string | null;
  /** Only the signed-in user's tickets; other users' tickets are never exposed. */
  tickets: SupportTicket[];
  /** Records a local preview ticket for an owned, recorded booking. Nothing is sent. */
  createTicket: (input: NewTicketInput) => string | null;
  /** Records a session-only demonstration booking with the outcome the viewer chose. Nothing is sent anywhere. */
  simulateBooking: (outcome: DemoBookingOutcome) => string | null;
  groupRequests: readonly GroupRequest[];
  /** Saves a clearly local record in this session. Nothing is sent anywhere. */
  createGroupRequest: (input: NewGroupRequest) => string | null;
  addTicketMessage: (reference: string, body: string) => boolean;
}
export type DemoBookingOutcome = "confirmed" | "pending" | "failed";

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
  const [allTickets, setAllTickets] = useState<SupportTicket[]>(() => [...sampleTickets]);
  const [allGroupRequests, setAllGroupRequests] = useState<GroupRequest[]>(() => [...sampleGroupRequests]);
  const currentUserId = demoSessionActive ? demoUserIds.current : null;
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
      const ownerId = demoAuth.currentUserId();
      if (!ownerId || !rentalSelection || !rentalDriver || !rentalPolicyAcknowledged) return null;
      const id = `RENTAL-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      setRentals((current) => [
        {
          ...rentalSelection,
          id,
          ownerId,
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
    changeRoom: (next) => {
      setSelection(next);
      setPolicyAcknowledged(false);
      setPaymentMethod(null);
      setPaymentDetailsPrepared(false);
    },
    updateCriteria: (criteria) => {
      setPolicyAcknowledged(false);
      setPaymentMethod(null);
      setPaymentDetailsPrepared(false);
      setSelection((s) => (s ? { ...s, criteria } : null));
      setGuests(null);
    },
    saveGuests: setGuests,
    cancelBooking: (id, cancelledAt = new Date().toISOString()) =>
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
                    at: cancelledAt,
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
    currentUserId,
    tickets: ownedTickets(allTickets, currentUserId),
    createTicket: (input) => {
      const access = resolveBookingAccess(input.bookingType, input.bookingId, { records, rentals }, currentUserId);
      if (access.state !== "ok" || !access.categories.includes(input.category)) return null;
      const now = new Date().toISOString();
      const reference = `TKT-LOCAL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      setAllTickets((current) => [
        {
          reference,
          bookingId: access.booking.bookingId,
          bookingReference: access.booking.bookingReference,
          bookingType: access.booking.bookingType,
          ownerId: access.booking.ownerId,
          category: input.category,
          subject: input.subject,
          status: "open",
          createdAt: now,
          updatedAt: now,
          origin: "local-preview",
          messages: [{ id: crypto.randomUUID(), author: "owner", body: input.description, at: now, attachment: input.attachment }],
        },
        ...current,
      ]);
      return reference;
    },
    simulateBooking: (outcome) => {
      if (!selection || !guests || !policyAcknowledged || !paymentDetailsPrepared || !currentUserId) return null;
      const now = new Date().toISOString();
      const id = `DEMO-LOCAL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      setRecords((current) => [
        {
          id,
          hotelId: selection.hotelId,
          status: outcome,
          bookedAt: localToday(),
          checkIn: selection.criteria.checkIn,
          checkOut: selection.criteria.checkOut,
          traveller: guests.leadName,
          owner: "mine",
          ownerId: currentUserId,
          agencyReference: guests.reference,
          cancellationFee: false,
          selection,
          policyAcknowledged: true,
          cancellationPolicySnapshot: snapshotCancellationPolicy(selection.rate.cancellationPolicy),
          guests,
          total: totalFor(selection),
          timeline: [{ label: `Demo simulation: ${outcome}`, at: now }],
        },
        ...current,
      ]);
      return id;
    },
    groupRequests: allGroupRequests.filter((request) => request.ownerId === currentUserId),
    createGroupRequest: (input) => {
      if (!currentUserId) return null;
      const reference = `GRP-LOCAL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      setAllGroupRequests((current) => [
        { ...input, reference, ownerId: currentUserId, status: "saved_locally", createdAt: new Date().toISOString(), origin: "local-preview" },
        ...current,
      ]);
      return reference;
    },
    addTicketMessage: (reference, body) => {
      const ticket = findOwnedTicket(allTickets, reference, currentUserId);
      if (!ticket || ticket.status === "closed" || !body.trim()) return false;
      const now = new Date().toISOString();
      setAllTickets((current) =>
        current.map((item) =>
          item.reference === ticket.reference && item.ownerId === currentUserId
            ? { ...item, updatedAt: now, messages: [...item.messages, { id: crypto.randomUUID(), author: "owner", body: body.trim(), at: now }] }
            : item,
        ),
      );
      return true;
    },
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
