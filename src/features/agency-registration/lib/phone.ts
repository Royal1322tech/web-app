import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
export const phoneCountries = getCountries();
export function validPhoneCountry(value: string): value is CountryCode {
  return phoneCountries.includes(value as CountryCode);
}
export function contactPhone(contact: { phone: string; phoneCountry: string; callingCode: string }) {
  if (!validPhoneCountry(contact.phoneCountry) || contact.callingCode !== `+${getCountryCallingCode(contact.phoneCountry)}`) return;
  const parsed = parsePhoneNumberFromString(contact.phone, { defaultCountry: contact.phoneCountry, extract: false });
  if (parsed?.isValid() && parsed.country === contact.phoneCountry && !parsed.ext) return parsed;
}
