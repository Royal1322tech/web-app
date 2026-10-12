export interface SampleBooking {
  id: string;
  hotelId: string;
  status: "confirmed" | "cancelled" | "pending";
  bookedAt: string;
  checkIn: string;
  checkOut: string;
  traveller: string;
  owner: "mine" | "other";
  agencyReference: string;
  cancellationFee: boolean;
}
// Demonstration records only. No reservation, payment or cancellation occurred.
export const bookings: readonly SampleBooking[] = [
  {
    id: "DEMO-1001",
    hotelId: "eastern-al-montazah",
    status: "confirmed",
    bookedAt: "2026-10-01",
    checkIn: "2026-10-20",
    checkOut: "2026-10-23",
    traveller: "Sample Traveller A",
    owner: "mine",
    agencyReference: "DEMO-A",
    cancellationFee: false,
  },
  {
    id: "DEMO-1002",
    hotelId: "coastal-retreat-demo",
    status: "pending",
    bookedAt: "2026-10-03",
    checkIn: "2026-10-25",
    checkOut: "2026-10-28",
    traveller: "Sample Traveller B",
    owner: "other",
    agencyReference: "DEMO-B",
    cancellationFee: false,
  },
  {
    id: "DEMO-1003",
    hotelId: "city-stay-demo",
    status: "cancelled",
    bookedAt: "2026-09-28",
    checkIn: "2026-10-10",
    checkOut: "2026-10-12",
    traveller: "Sample Traveller C",
    owner: "mine",
    agencyReference: "DEMO-C",
    cancellationFee: true,
  },
  {
    id: "DEMO-1004",
    hotelId: "garden-stay-demo",
    status: "confirmed",
    bookedAt: "2026-10-04",
    checkIn: "2026-11-01",
    checkOut: "2026-11-04",
    traveller: "Sample Traveller D",
    owner: "mine",
    agencyReference: "DEMO-D",
    cancellationFee: false,
  },
];
