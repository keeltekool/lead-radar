"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import LanguageSwitcher from "@/components/language-switcher";
import { LeadRadarLogo } from "@/components/LeadRadarLogo";

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const cleanPath = pathname.replace(/^\/(et|en)/, "") || "/";
  const isSearch = cleanPath === "/";
  const isDashboard = cleanPath === "/dashboard";

  const linkClasses = (active: boolean) =>
    active
      ? "text-teal-500 font-semibold border-b-2 border-teal-500 pb-1"
      : "text-teal-800 hover:text-teal-500 transition-colors";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-teal-100 shadow-navbar">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <LeadRadarLogo variant="compact" />
        </Link>

        {/* Nav links */}
        <nav className="ml-auto flex items-center gap-6 text-[13px] font-medium">
          <Link href="/" className={linkClasses(isSearch)}>
            {t("search")}
          </Link>

          <SignedIn>
            <Link href="/dashboard" className={linkClasses(isDashboard)}>
              {t("saved")}
            </Link>
          </SignedIn>
        </nav>

        {/* Language + Auth */}
        <div className="ml-6 flex items-center gap-3">
          <LanguageSwitcher />
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-button border border-teal-300 text-teal-700 font-medium px-4 py-2 text-[13px] hover:bg-teal-50 hover:border-teal-500 transition-colors">
                {t("signIn")}
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
