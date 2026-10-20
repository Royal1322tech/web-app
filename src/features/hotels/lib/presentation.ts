export function hotelDisplayName(name: string) {
  return name.replace(/\s*[—–-]\s*(?:sample|نموذج)$/iu, "");
}

export function hotelDisplayAddress(address: string, locale: "en" | "ar") {
  if (/^sample property\s*[—–-]\s*address pending$/i.test(address)) {
    return locale === "ar" ? "العنوان غير متوفر" : "Address not provided";
  }
  if (/^فندق تجريبي\s*[—–-]\s*العنوان غير متاح$/.test(address)) {
    return locale === "ar" ? "العنوان غير متوفر" : "Address not provided";
  }
  return address;
}

export function hotelTelephoneHref(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const normalized = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized) ? `tel:${normalized}` : undefined;
}
