import type { CancellationPolicy } from "../cancellation-policy";
import type { HotelPhoto, LocalizedText } from "../types";
import { boardPlanLabels, type BoardPlan } from "../lib/board-plan-definitions";
import { gallery } from "./hotels.fixture";

export interface SampleRoomRate {
  cancellationPolicy?: CancellationPolicy;
  terms?: readonly LocalizedText[];
  id: string;
  boardPlan: BoardPlan;
  board: LocalizedText;
  nightlyRate: number;
  packaging: boolean;
  availability: DemoOfferAvailability;
}

export interface DemoOfferAvailability {
  hotelId: string;
  roomId: string;
  rateId: string;
  source: "demo-fixture";
  status: "available" | "unavailable";
  remainingInventory?: number;
}
export interface SampleRoom {
  id: string;
  name: LocalizedText;
  size: number;
  bed: LocalizedText;
  occupancy: { maxAdults: number; maxChildren: number };
  photos: readonly HotelPhoto[];
  included: readonly LocalizedText[];
  rates: readonly SampleRoomRate[];
}

type RoomRateDefinition = Omit<SampleRoomRate, "availability">;

function rate(id: string, boardPlan: BoardPlan, nightlyRate: number): RoomRateDefinition {
  return { id, boardPlan, board: boardPlanLabels[boardPlan], nightlyRate, packaging: false };
}

function attachAvailability(
  definition: RoomRateDefinition,
  hotelId: string,
  roomId: string,
  status: DemoOfferAvailability["status"],
): SampleRoomRate {
  return {
    ...definition,
    availability: {
      hotelId,
      roomId,
      rateId: definition.id,
      source: "demo-fixture",
      status,
    },
  };
}

// Existing local fixture rates remain illustrative and carry no supplier policy.
const doubleRoom: Omit<SampleRoom, "id" | "rates"> & { rates: readonly RoomRateDefinition[] } = {
  name: { en: "1x Double for 2 adults", ar: "١ × غرفة مزدوجة لشخصين بالغين" },
  size: 8,
  bed: { en: "1 Double bed 130–150 width", ar: "سرير مزدوج واحد بعرض ١٣٠–١٥٠" },
  occupancy: { maxAdults: 2, maxChildren: 0 },
  photos: [gallery[1]],
  included: [
    { en: "Internet Access", ar: "اتصال بالإنترنت" },
    { en: "Tea and coffee making facilities", ar: "مرافق إعداد الشاي والقهوة" },
    { en: "Ironing Set", ar: "أدوات كي الملابس" },
    { en: "Number of bedrooms (2)", ar: "عدد غرف النوم (٢)" },
    { en: "Safe", ar: "خزنة" },
    { en: "Housekeeping", ar: "خدمة تنظيف الغرف" },
    { en: "WiFi", ar: "واي فاي" },
    { en: "Air Conditioner", ar: "تكييف" },
  ],
  rates: [
    {
      id: "bed-breakfast-package",
      boardPlan: "breakfast",
      board: boardPlanLabels.breakfast,
      nightlyRate: 185,
      packaging: true,
    },
    {
      id: "bed-breakfast",
      boardPlan: "breakfast",
      board: boardPlanLabels.breakfast,
      nightlyRate: 185,
      packaging: false,
    },
    {
      id: "english-breakfast-1",
      boardPlan: "breakfast",
      board: boardPlanLabels.breakfast,
      nightlyRate: 185,
      packaging: false,
    },
    {
      id: "english-breakfast-2",
      boardPlan: "breakfast",
      board: boardPlanLabels.breakfast,
      nightlyRate: 185,
      packaging: false,
    },
  ],
};
export const sampleRooms: readonly SampleRoom[] = [1, 2, 3].map((n) => ({
  ...doubleRoom,
  id: `double-${n}`,
  rates: doubleRoom.rates.map((definition) => attachAvailability(
    definition,
    "eastern-al-montazah",
    `double-${n}`,
    n === 3 ? "unavailable" : "available",
  )),
}));

function demoRoom(
  hotelId: string,
  id: string,
  name: LocalizedText,
  size: number,
  bed: LocalizedText,
  photo: HotelPhoto,
  maxAdults: number,
  maxChildren: number,
  rates: readonly { board: BoardPlan; price: number }[],
): SampleRoom {
  return {
    id,
    name,
    size,
    bed,
    occupancy: { maxAdults, maxChildren },
    photos: [photo],
    included: [],
    rates: rates.map(({ board, price }, index) => attachAvailability(
      rate(`${id}-rate-${index + 1}`, board, price), hotelId, id, "available",
    )),
  };
}

const azureRooms: readonly SampleRoom[] = [
  demoRoom("royal-azure-resort", "azure-classic", { en: "Classic Room", ar: "غرفة كلاسيكية" }, 30,
    { en: "1 king bed", ar: "سرير كينغ واحد" }, gallery[3], 2, 1,
    [{ board: "room", price: 92 }, { board: "breakfast", price: 118 }]),
  demoRoom("royal-azure-resort", "azure-sea-view", { en: "Sea View Room", ar: "غرفة بإطلالة بحرية" }, 38,
    { en: "1 king bed", ar: "سرير كينغ واحد" }, gallery[4], 2, 1,
    [{ board: "breakfast", price: 145 }, { board: "half-board", price: 186 }]),
];
const coralRooms: readonly SampleRoom[] = [
  demoRoom("coral-bay-grand-resort", "coral-family", { en: "Family Room", ar: "غرفة عائلية" }, 42,
    { en: "1 king bed and 2 twin beds", ar: "سرير كينغ وسريران مفردان" }, gallery[4], 4, 2,
    [{ board: "breakfast", price: 132 }, { board: "full-board", price: 194 }]),
  demoRoom("coral-bay-grand-resort", "coral-beach-suite", { en: "Beach Suite", ar: "جناح الشاطئ" }, 58,
    { en: "1 king bed and sofa bed", ar: "سرير كينغ وسرير أريكة" }, gallery[0], 3, 2,
    [{ board: "all-inclusive", price: 258 }]),
];
const pearlRooms: readonly SampleRoom[] = [
  demoRoom("mediterranean-pearl-hotel", "pearl-classic", { en: "Classic Double Room", ar: "غرفة مزدوجة كلاسيكية" }, 27,
    { en: "1 double bed", ar: "سرير مزدوج واحد" }, gallery[1], 2, 0,
    [{ board: "room", price: 84 }, { board: "breakfast", price: 108 }]),
  demoRoom("mediterranean-pearl-hotel", "pearl-sea-suite", { en: "Mediterranean Suite", ar: "جناح البحر المتوسط" }, 49,
    { en: "1 king bed", ar: "سرير كينغ واحد" }, gallery[4], 2, 1,
    [{ board: "ultra-all-inclusive", price: 288 }]),
];

export function roomsForHotel(id: string): readonly SampleRoom[] {
  switch (id) {
    case "eastern-al-montazah": return sampleRooms;
    case "royal-azure-resort": return azureRooms;
    case "coral-bay-grand-resort": return coralRooms;
    case "mediterranean-pearl-hotel": return pearlRooms;
    default: return [];
  }
}
