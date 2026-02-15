"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import LanguageSwitcher from "@/components/language-switcher";

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const cleanPath = pathname.replace(/^\/(et|en)/, "") || "/";
  const isSearch = cleanPath === "/";
  const isDashboard = cleanPath === "/dashboard";

  const linkClasses = (active: boolean) =>
    active
      ? "text-amber-600 font-semibold border-b-2 border-amber-500 pb-1"
      : "text-amber-900 hover:text-amber-600 transition-colors";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-amber-100 shadow-navbar">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <div className="h-8 w-8 rounded-icon bg-amber-500 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </div>
          <span className="font-semibold text-amber-900 text-base">Lead Radar</span>
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
              <button className="rounded-button border border-amber-300 text-amber-800 font-medium px-4 py-2 text-[13px] hover:bg-amber-50 hover:border-amber-500 transition-colors">
                {t("signIn")}
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
