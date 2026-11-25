import { rememberedDestinationName } from "../api/b2b-destinations";
import { findDestination } from "../data/destinations";

/** A destination ID's display name: the built-in list, then a name chosen from the API, then the ID. */
export function destinationName(id: string | undefined | null, locale: string): string | undefined {
  if (!id) return undefined;
  const language = locale === "ar" ? "ar" : "en";
  const known = findDestination(id);
  if (known) return known.name[language];
  return rememberedDestinationName(id, language) ?? id;
}
