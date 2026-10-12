import type { HotelPhoto, LocalizedText } from "../types";
import { gallery } from "./hotels.fixture";

export interface SampleRoomRate {
  id: string;
  board: LocalizedText;
  nightlyRate: number;
  packaging: boolean;
}
export interface SampleRoom {
  id: string;
  name: LocalizedText;
  size: number;
  bed: LocalizedText;
  photos: readonly HotelPhoto[];
  included: readonly LocalizedText[];
  rates: readonly SampleRoomRate[];
}

// Section 2 reference: three Double room rows; these are design fixtures, not
// property inventory. $185/night was explicitly selected by the user to resolve
// conflicting Figma totals. Never derive availability or a booking from these.
const doubleRoom: Omit<SampleRoom, "id"> = {
  name: { en: "1x Double for 2 adults", ar: "١ × غرفة مزدوجة لشخصين بالغين" },
  size: 8,
  bed: { en: "1 Double bed 130–150 width", ar: "سرير مزدوج واحد بعرض ١٣٠–١٥٠" },
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
      board: { en: "Bed And Breakfast", ar: "مبيت وإفطار" },
      nightlyRate: 185,
      packaging: true,
    },
    {
      id: "bed-breakfast",
      board: { en: "Bed And Breakfast", ar: "مبيت وإفطار" },
      nightlyRate: 185,
      packaging: false,
    },
    {
      id: "english-breakfast-1",
      board: { en: "English Breakfast", ar: "إفطار إنجليزي" },
      nightlyRate: 185,
      packaging: false,
    },
    {
      id: "english-breakfast-2",
      board: { en: "English Breakfast", ar: "إفطار إنجليزي" },
      nightlyRate: 185,
      packaging: false,
    },
  ],
};
export const sampleRooms: readonly SampleRoom[] = [1, 2, 3].map((n) => ({
  ...doubleRoom,
  id: `double-${n}`,
}));
export function roomsForHotel(id: string): readonly SampleRoom[] {
  // No room data has been supplied for the other existing hotel fixtures.
  return id === "eastern-al-montazah" ? sampleRooms : [];
}
