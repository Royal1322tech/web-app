import { expect, test } from "@playwright/test";
import { parseB2CHotelSearch, toB2CHotelSearchRequest } from "../src/features/hotels/api/b2c-hotel-search";
import type { HotelSearchCriteria } from "../src/features/home/schemas/hotel-search.schema";
import { parseFoundation } from "../src/lib/api/foundation";

/* Contract checks without a browser or network: they only exercise request mapping and parsing. */

test.describe("foundation check", () => {
  test("accepts the responses observed on staging", () => {
    expect(parseFoundation({ locale: "en", direction: "ltr" })).toEqual({ locale: "en", direction: "ltr" });
    expect(parseFoundation({ locale: "ar", direction: "rtl" })).toEqual({ locale: "ar", direction: "rtl" });
  });

  test("rejects anything else, including Laravel error bodies", () => {
    for (const value of [null, "ok", {}, { message: "Unauthenticated." }, { locale: "en", direction: "up" }, { locale: "", direction: "ltr" }]) {
      expect(() => parseFoundation(value)).toThrow();
    }
  });
});

test.describe("B2C hotel search request", () => {
  const criteria: HotelSearchCriteria = {
    destination: "Cairo",
    nationality: "eg",
    checkIn: "2026-12-01",
    checkOut: "2026-12-04",
    rooms: [{ adults: 2, childAges: [] }, { adults: 1, childAges: [4, 9] }],
  };
  const point = { latitude: 30.0444, longitude: 31.2357 };

  test("matches the field names and formats staging validates", () => {
    expect(toB2CHotelSearchRequest(criteria, point)).toEqual({
      checkin: "2026-12-01",
      checkout: "2026-12-04",
      latitude: 30.0444,
      longitude: 31.2357,
      residency: "EG",
      guests: [{ adults: 2, children: [] }, { adults: 1, children: [4, 9] }],
    });
  });

  test("returns null rather than guessing a missing value", () => {
    expect(toB2CHotelSearchRequest({ ...criteria, nationality: undefined }, point)).toBeNull();
    expect(toB2CHotelSearchRequest({ ...criteria, nationality: "EGY" }, point)).toBeNull();
    expect(toB2CHotelSearchRequest(criteria, { latitude: 91, longitude: 0 })).toBeNull();
    expect(toB2CHotelSearchRequest(criteria, { latitude: Number.NaN, longitude: 0 })).toBeNull();
  });
});

test.describe("B2C hotel search response", () => {
  test("reads the total and keeps hotel records as supplied", () => {
    const hotel = { id: "h-1", name: "Supplier hotel", price: { amount: 120.5, currency: "EGP" } };
    expect(parseB2CHotelSearch({ success: true, data: { hotels: [hotel], total: 1 } })).toEqual({ total: 1, hotels: [hotel] });
    expect(parseB2CHotelSearch({ success: true, data: { hotels: [], total: 0 } })).toEqual({ total: 0, hotels: [] });
  });

  test("never treats the observed failure envelope or a malformed body as results", () => {
    const unavailable = { success: false, code: "HOTEL_SUPPLIER_UNAVAILABLE", message: "Hotel search is currently unavailable.", data: { hotels: [], total: 0 } };
    for (const value of [unavailable, {}, { success: true }, { success: true, data: { hotels: "x", total: 0 } }, { success: true, data: { hotels: [], total: -1 } }]) {
      expect(() => parseB2CHotelSearch(value)).toThrow();
    }
  });
});
