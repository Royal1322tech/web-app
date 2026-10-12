import { useParams } from "react-router-dom";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { HotelDetails } from "@/features/hotels/components/hotel-details";
import { useLocale } from "@/features/localization/locale-provider";
import { NotFound } from "@/app/router";

export default function HotelPage() {
  const { hotelId } = useParams();
  const { locale } = useLocale();
  const hotel = hotels.find((item) => item.id === hotelId);
  if (!hotel) return <NotFound />;
  return (
    <>
      <title>{`${hotel.name[locale]} | Royal Vacation`}</title>
      <HotelDetails hotel={hotel} />
    </>
  );
}
