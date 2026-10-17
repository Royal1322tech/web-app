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
