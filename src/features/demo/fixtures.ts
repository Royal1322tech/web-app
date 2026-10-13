import { bookings } from "@/features/bookings/data/bookings.fixture";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import {
  roomsForHotel,
  sampleRooms,
} from "@/features/hotels/data/rooms.fixture";
import { samplePriceBreakdown } from "@/features/hotels/lib/sample-stay";
import type {
  DemoBooking,
  AgencyProfile,
  DemoNotification,
  Transaction,
} from "./types";

// Frontend demonstrations only. No supplier inventory or production credit policy.
export const demoProfile: AgencyProfile = {
  name: "Horizon Travel — Demo Agency",
  contact: "Alex Morgan",
  email: "partner@example.com",
  phone: "+20 100 000 0000",
  address: "Alexandria, Egypt",
  country: "Egypt",
};
export const demoNotifications: DemoNotification[] = [
  {
    id: "notice-1",
    title: "Your agency workspace is ready",
    description:
      "Explore sample hotels, booking simulations and your credit overview.",
    href: "/agency",
    read: false,
  },
  {
    id: "notice-2",
    title: "A sample booking needs review",
    description:
      "DEMO-1002 is pending. Open the timeline to review its demonstration status.",
    href: "/bookings/DEMO-1002",
    read: false,
  },
  {
    id: "notice-3",
    title: "Explore your credit statement",
    description: "View illustrative transactions. No funds have moved.",
    href: "/transactions",
    read: true,
  },
];
const transactionFixtures: readonly Transaction[] = [
  {
    id: "TX-DEMO-001",
    date: "2026-09-01",
    type: "credit",
    amount: 4000,
    status: "completed",
    description: "Opening demo credit",
    reference: "STATEMENT-DEMO-01",
  },
  {
    id: "TX-DEMO-002",
    date: "2026-10-01",
    type: "reservation",
    amount: -555,
    status: "completed",
    description: "Sample hotel reservation",
    reference: "DEMO-1001",
  },
  {
    id: "TX-DEMO-003",
    date: "2026-10-10",
    type: "adjustment",
    amount: -549,
    status: "completed",
    description: "Illustrative adjustment",
    reference: "ADJ-DEMO-01",
  },
  {
    id: "TX-DEMO-004",
    date: "2026-10-03",
    type: "reservation",
    amount: -552,
    status: "pending",
    description: "Pending reservation preview",
    reference: "DEMO-1002",
  },
  {
    id: "TX-DEMO-005",
    date: "2026-10-08",
    type: "credit",
    amount: 700,
    status: "failed",
    description: "Failed credit preview",
    reference: "CREDIT-DEMO-02",
  },
  {
    id: "TX-DEMO-006",
    date: "2026-10-07",
    type: "reservation",
    amount: -396,
    status: "completed",
    description: "Sample stay",
    reference: "DEMO-1004",
  },
];
export const demoTransactions = [...transactionFixtures].sort((a, b) =>
  b.date.localeCompare(a.date),
);
const completedTransactions = demoTransactions.filter(
  (row) => row.status === "completed",
);
export const demoFinance = {
  available: completedTransactions.reduce((sum, row) => sum + row.amount, 0),
  used: -completedTransactions
    .filter((row) => row.amount < 0)
    .reduce((sum, row) => sum + row.amount, 0),
  limit: 4000,
  outstanding: -demoTransactions
    .filter((row) => row.status === "pending" && row.amount < 0)
    .reduce((sum, row) => sum + row.amount, 0),
  currency: "USD",
} as const;
export function initialBookings(): DemoBooking[] {
  return [
    ...bookings,
    {
      ...bookings[0],
      id: "DEMO-1005",
      status: "failed" as const,
      traveller: "Sample Traveller E",
      agencyReference: "DEMO-E",
    },
  ].map((b) => {
    const room = roomsForHotel(b.hotelId)[0] ?? {
      ...sampleRooms[0],
      rates: [
        {
          ...sampleRooms[0].rates[0],
          nightlyRate: hotels.find((h) => h.id === b.hotelId)!.nightlyRate,
        },
      ],
    };
    return {
      ...b,
      selection: {
        hotelId: b.hotelId,
        room,
        rate: room.rates[0],
        criteria: {
          destination: hotels.find((h) => h.id === b.hotelId)!.city.en,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          rooms: [{ adults: 2, childAges: [] }],
        },
      },
      guests: {
        leadName: b.traveller,
        email: "guest@example.com",
        phone: "+20 100 000 0000",
        additional: [{ name: "Sample Companion" }],
        requests: "",
        reference: b.agencyReference,
      },
      total: samplePriceBreakdown(room.rates[0].nightlyRate, b).total,
      timeline: [
        { label: "Demo record created", at: b.bookedAt },
        { label: `Demo ${b.status}`, at: b.bookedAt },
      ],
    };
  });
}
