import { fitsDemoRoom, roomIsUnavailable } from "./room-policy";
import { useNavigate } from "react-router-dom";
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
  dates?: StayDates & Partial<Pick<HotelSearchCriteria, "rooms">>;
}) {
  const { t } = useLocale();
  const { selectRoom } = useDemo();
  const navigate = useNavigate();
  const soldOut = roomIsUnavailable(room.id);
  const criteria = {
    ...defaultCriteria(hotels.find((h) => h.id === hotel.id)?.city.en ?? ""),
    ...dates,
  };
  const mismatch = !fitsDemoRoom(criteria);
  return (
    <div>
      <button
        type="button"
        className="button button--primary"
        disabled={soldOut || mismatch}
        onClick={() => {
          selectRoom({ hotelId: hotel.id, room, rate, criteria });
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
            "This room supports up to 2 adults per room and no children. Adjust your search.",
            "تتسع هذه الغرفة لبالغين كحد أقصى لكل غرفة دون أطفال. عدّل البحث.",
          )}
        </p>
      )}
    </div>
  );
}
