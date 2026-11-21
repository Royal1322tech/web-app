import { demoUserIds } from "@/features/auth/demo-auth";
import type { GroupRequest, NewGroupRequest, GroupRequestStatus } from "./group-request-types";

function sample(number: number, createdOn: string, status: GroupRequestStatus, details: NewGroupRequest): GroupRequest {
  return {
    ...details,
    reference: `GRP-SAMPLE-${String(number).padStart(4, "0")}`,
    ownerId: demoUserIds.current,
    status,
    createdAt: `${createdOn}T09:00:00.000Z`,
    origin: "sample",
  };
}

// Illustrative records with fictional people and agencies, labelled "Example request" wherever they
// appear. They are not customer submissions, and no request was made.
export const sampleGroupRequests: readonly GroupRequest[] = [
  sample(6, "2026-10-28", "under_review", { name: "Mariam Fawzy", email: "mariam@example.com", agency: "Blue Horizon Travel", subject: "Spring incentive retreat", destination: "Sharm El Sheikh", start: "2027-03-14", end: "2027-03-18", passengers: 42, rooms: 22, service: "both", message: "Beachfront resort for a corporate incentive group. One meeting room on the first morning, airport transfers on arrival and departure." }),
  sample(5, "2026-10-19", "quotation_sent", { name: "Karim Adel", email: "karim@example.com", agency: "Nile Gate Tours", subject: "Luxor and Aswan cultural tour", destination: "Luxor & Aswan", start: "2027-02-06", end: "2027-02-12", passengers: 28, rooms: 15, service: "both", message: "Five-star hotels in both cities with a coach between them. Group includes four guests needing step-free rooms." }),
  sample(4, "2026-10-11", "in_discussion", { name: "Salma Nabil", email: "salma@example.com", agency: "Cedar Voyages", subject: "University alumni weekend", destination: "Istanbul, Turkey", start: "2027-04-22", end: "2027-04-26", passengers: 35, rooms: 18, service: "hotels", message: "Central hotel near the old city, breakfast included. Twin rooms preferred for most of the group." }),
  sample(3, "2026-08-30", "closed", { name: "Omar Hany", email: "omar@example.com", agency: "Oasis Business Travel", subject: "Annual sales conference", destination: "Dubai, UAE", start: "2026-10-05", end: "2026-10-08", passengers: 60, rooms: 32, service: "both", message: "Conference hotel with a ballroom for one full day, and airport transfers in two arrival waves." }),
  sample(2, "2026-10-24", "under_review", { name: "Nour Sami", email: "nour@example.com", agency: "Red Sea Escapes", subject: "Diving club holiday", destination: "Hurghada", start: "2027-05-09", end: "2027-05-15", passengers: 16, rooms: 9, service: "hotels", message: "All-inclusive resort close to a dive centre, with early breakfast on diving days." }),
  sample(1, "2026-10-06", "quotation_sent", { name: "Youssef Tarek", email: "youssef@example.com", agency: "Pharaoh Gate Holidays", subject: "Family reunion trip", destination: "Cairo & Giza", start: "2026-12-27", end: "2026-12-31", passengers: 22, rooms: 11, service: "transport", message: "Private coach for airport transfers and a full-day trip to the Pyramids and the Grand Egyptian Museum." }),
];
