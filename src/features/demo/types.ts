import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import type {
  SampleRoom,
  SampleRoomRate,
} from "@/features/hotels/data/rooms.fixture";
import type { SampleBooking } from "@/features/bookings/data/bookings.fixture";
export type DemoStatus = "confirmed" | "pending" | "failed" | "cancelled";
export interface DemoSelection {
  hotelId: string;
  room: SampleRoom;
  rate: SampleRoomRate;
  criteria: HotelSearchCriteria;
}
export interface GuestValues {
  leadName: string;
  email: string;
  phone: string;
  additional: { name: string }[];
  requests: string;
  reference: string;
}
export interface DemoBooking extends Omit<SampleBooking, "status"> {
  status: DemoStatus;
  selection: DemoSelection;
  guests: GuestValues;
  total: number;
  timeline: { label: string; at: string }[];
}
export interface AgencyProfile {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  country: string;
}
export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  href: string;
  read: boolean;
}
export interface Transaction {
  id: string;
  date: string;
  type: "credit" | "reservation" | "adjustment";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  reference: string;
}
