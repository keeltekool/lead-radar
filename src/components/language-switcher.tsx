"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "et" ? "en" : "et";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={toggle}
      className="rounded-badge border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase text-slate-500 hover:border-amber-300 hover:text-amber-700 transition-colors"
    >
      {locale === "et" ? "EN" : "ET"}
    </button>
  );
}
