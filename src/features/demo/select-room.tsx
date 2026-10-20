import { demoOfferIsSelectable, fitsDemoRoom } from "./room-policy";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import type {
  SampleRoom,
  SampleRoomRate,
} from "@/features/hotels/data/rooms.fixture";
import type { HotelSummary } from "@/features/hotels/types";
import type { StayDates } from "@/features/hotels/lib/sample-stay";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo, defaultCriteria } from "./demo-provider";
export function SelectRoomButton({
  hotel,
  room,
  rate,
  dates,
}: {
  hotel: HotelSummary;
  room: SampleRoom;
  rate: SampleRoomRate;
  dates?: StayDates & Partial<Pick<HotelSearchCriteria, "rooms" | "nationality" | "destination">>;
}) {
  const { t } = useLocale();
  const { selectRoom, changeRoom } = useDemo();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changingRoom = searchParams.get("changeRoom") === "1";
  const soldOut = !demoOfferIsSelectable(rate, hotel.id, room.id);
  const criteria = {
    ...defaultCriteria(hotels.find((h) => h.id === hotel.id)?.city.en ?? ""),
    ...dates,
  };
  const mismatch = !fitsDemoRoom(criteria, room.occupancy);
  return (
    <div>
      <button
        type="button"
        className="button button--primary"
        disabled={soldOut || mismatch}
        onClick={() => {
          const selection = { hotelId: hotel.id, room, rate, criteria };
          if (changingRoom) changeRoom(selection);
          else selectRoom(selection);
          navigate("/booking/summary");
        }}
      >
        {soldOut
          ? t("Sold out", "نفدت الغرف")
          : t("Select room", "اختر الغرفة")}
      </button>
      {mismatch && (
        <p className="fine-print">
          {t(
            `This room supports up to ${room.occupancy.maxAdults} adults and ${room.occupancy.maxChildren} children per room. Adjust your search.`,
            `تتسع هذه الغرفة لـ ${room.occupancy.maxAdults} بالغين و ${room.occupancy.maxChildren} أطفال كحد أقصى لكل غرفة. عدّل البحث.`,
          )}
        </p>
      )}
    </div>
  );
}
