import { useLocale } from "@/features/localization/locale-provider";

/** Sets the document title in the active interface language. */
export function PageTitle({ en, ar }: { en: string; ar?: string }) {
  const { t } = useLocale();
  return <title>{`${t(en, ar)} | Royal Vacation`}</title>;
}
