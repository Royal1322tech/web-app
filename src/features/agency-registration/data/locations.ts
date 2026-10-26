// Static location data for registration until a backend location service is available.
// This is a practical selection of countries and major cities, not a complete world gazetteer.
// Country codes are ISO 3166-1 alpha-2; city ids are stable `CC-slug` identifiers. Replace this
// module with backend-provided data later without changing the stored identifiers.

export interface LocationName {
  en: string;
  ar: string;
}

export interface LocationCity {
  id: string;
  name: LocationName;
}

export interface LocationCountry {
  code: string;
  name: LocationName;
  cities: readonly LocationCity[];
}

function city(country: string, slug: string, en: string, ar: string): LocationCity {
  return { id: `${country}-${slug}`, name: { en, ar } };
}

export const locationCountries: readonly LocationCountry[] = [
  {
    code: "EG",
    name: { en: "Egypt", ar: "مصر" },
    cities: [
      city("EG", "cairo", "Cairo", "القاهرة"),
      city("EG", "giza", "Giza", "الجيزة"),
      city("EG", "alexandria", "Alexandria", "الإسكندرية"),
      city("EG", "sharm-el-sheikh", "Sharm El Sheikh", "شرم الشيخ"),
      city("EG", "hurghada", "Hurghada", "الغردقة"),
      city("EG", "luxor", "Luxor", "الأقصر"),
      city("EG", "aswan", "Aswan", "أسوان"),
      city("EG", "marsa-alam", "Marsa Alam", "مرسى علم"),
      city("EG", "port-said", "Port Said", "بورسعيد"),
      city("EG", "mansoura", "Mansoura", "المنصورة"),
      city("EG", "tanta", "Tanta", "طنطا"),
      city("EG", "ismailia", "Ismailia", "الإسماعيلية"),
    ],
  },
  {
    code: "SA",
    name: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
    cities: [
      city("SA", "riyadh", "Riyadh", "الرياض"),
      city("SA", "jeddah", "Jeddah", "جدة"),
      city("SA", "makkah", "Makkah", "مكة المكرمة"),
      city("SA", "madinah", "Madinah", "المدينة المنورة"),
      city("SA", "dammam", "Dammam", "الدمام"),
      city("SA", "khobar", "Al Khobar", "الخبر"),
      city("SA", "taif", "Taif", "الطائف"),
      city("SA", "abha", "Abha", "أبها"),
      city("SA", "tabuk", "Tabuk", "تبوك"),
      city("SA", "alula", "AlUla", "العلا"),
    ],
  },
  {
    code: "AE",
    name: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
    cities: [
      city("AE", "abu-dhabi", "Abu Dhabi", "أبوظبي"),
      city("AE", "dubai", "Dubai", "دبي"),
      city("AE", "sharjah", "Sharjah", "الشارقة"),
      city("AE", "ajman", "Ajman", "عجمان"),
      city("AE", "ras-al-khaimah", "Ras Al Khaimah", "رأس الخيمة"),
      city("AE", "fujairah", "Fujairah", "الفجيرة"),
      city("AE", "umm-al-quwain", "Umm Al Quwain", "أم القيوين"),
      city("AE", "al-ain", "Al Ain", "العين"),
    ],
  },
  {
    code: "KW",
    name: { en: "Kuwait", ar: "الكويت" },
    cities: [
      city("KW", "kuwait-city", "Kuwait City", "مدينة الكويت"),
      city("KW", "hawalli", "Hawalli", "حولي"),
      city("KW", "salmiya", "Salmiya", "السالمية"),
      city("KW", "farwaniya", "Farwaniya", "الفروانية"),
      city("KW", "jahra", "Jahra", "الجهراء"),
      city("KW", "ahmadi", "Ahmadi", "الأحمدي"),
    ],
  },
  {
    code: "QA",
    name: { en: "Qatar", ar: "قطر" },
    cities: [
      city("QA", "doha", "Doha", "الدوحة"),
      city("QA", "al-rayyan", "Al Rayyan", "الريان"),
      city("QA", "al-wakrah", "Al Wakrah", "الوكرة"),
      city("QA", "al-khor", "Al Khor", "الخور"),
      city("QA", "lusail", "Lusail", "لوسيل"),
    ],
  },
  {
    code: "BH",
    name: { en: "Bahrain", ar: "البحرين" },
    cities: [
      city("BH", "manama", "Manama", "المنامة"),
      city("BH", "muharraq", "Muharraq", "المحرق"),
      city("BH", "riffa", "Riffa", "الرفاع"),
    ],
  },
  {
    code: "OM",
    name: { en: "Oman", ar: "عُمان" },
    cities: [
      city("OM", "muscat", "Muscat", "مسقط"),
      city("OM", "salalah", "Salalah", "صلالة"),
      city("OM", "sohar", "Sohar", "صحار"),
      city("OM", "nizwa", "Nizwa", "نزوى"),
    ],
  },
  {
    code: "JO",
    name: { en: "Jordan", ar: "الأردن" },
    cities: [
      city("JO", "amman", "Amman", "عمّان"),
      city("JO", "aqaba", "Aqaba", "العقبة"),
      city("JO", "irbid", "Irbid", "إربد"),
      city("JO", "zarqa", "Zarqa", "الزرقاء"),
    ],
  },
  {
    code: "MA",
    name: { en: "Morocco", ar: "المغرب" },
    cities: [
      city("MA", "casablanca", "Casablanca", "الدار البيضاء"),
      city("MA", "rabat", "Rabat", "الرباط"),
      city("MA", "marrakesh", "Marrakesh", "مراكش"),
      city("MA", "fes", "Fes", "فاس"),
      city("MA", "tangier", "Tangier", "طنجة"),
      city("MA", "agadir", "Agadir", "أكادير"),
    ],
  },
  {
    code: "TR",
    name: { en: "Türkiye", ar: "تركيا" },
    cities: [
      city("TR", "istanbul", "Istanbul", "إسطنبول"),
      city("TR", "ankara", "Ankara", "أنقرة"),
      city("TR", "izmir", "Izmir", "إزمير"),
      city("TR", "antalya", "Antalya", "أنطاليا"),
      city("TR", "bursa", "Bursa", "بورصة"),
    ],
  },
  {
    code: "GB",
    name: { en: "United Kingdom", ar: "المملكة المتحدة" },
    cities: [
      city("GB", "london", "London", "لندن"),
      city("GB", "manchester", "Manchester", "مانشستر"),
      city("GB", "birmingham", "Birmingham", "برمنغهام"),
      city("GB", "edinburgh", "Edinburgh", "إدنبرة"),
    ],
  },
  {
    code: "US",
    name: { en: "United States", ar: "الولايات المتحدة" },
    cities: [
      city("US", "new-york", "New York", "نيويورك"),
      city("US", "los-angeles", "Los Angeles", "لوس أنجلوس"),
      city("US", "chicago", "Chicago", "شيكاغو"),
      city("US", "miami", "Miami", "ميامي"),
      city("US", "houston", "Houston", "هيوستن"),
    ],
  },
];

export function citiesForCountry(countryCode: string): readonly LocationCity[] {
  return locationCountries.find((country) => country.code === countryCode)?.cities ?? [];
}

/** Display name for a stored city value; free-text cities (countries without a list) are returned as typed. */
export function cityLabel(countryCode: string, cityValue: string, locale: "en" | "ar" = "en") {
  return citiesForCountry(countryCode).find((item) => item.id === cityValue)?.name[locale] ?? cityValue;
}
