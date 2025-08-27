"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase-client";
import { User } from "@supabase/supabase-js";
import Image from "next/image";
import styles from "../stylesheets/nav.module.css";
import { Icon } from "@iconify/react";

type HeaderVariant = "landing" | "default";

export function Header({ variant }: { variant?: HeaderVariant }) {
  const pathname = usePathname();
  const computedVariant: HeaderVariant =
    variant ?? (pathname === "/" ? "landing" : "default");
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDirOpen, setMobileDirOpen] = useState(true);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileOpen]);

  // Check authentication status
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const base = "sticky top-0 z-40 transition-colors ";
  const landingTop = "bg-transparent text-white";
  const defaultTop = "bg-white text-neutral-900 border-b border-neutral-200";
  const scrolled = "bg-white text-neutral-900 border-b border-neutral-200";

  const headerClass = cn(
    base,
    isScrolled ? scrolled : computedVariant === "landing" ? landingTop : defaultTop
  );

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={headerClass}>
      <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div >
          <Link
            href="/"
            className={`text-base sm:text-lg font-bold tracking-tight hover:opacity-80 ${styles.logo} transition-opacity`}
          >
          <Icon icon="solar:ghost-bold" style={{fontSize: '28px'}}  />
            n8n Growth Agents
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          {/* Directory dropdown */}
          <div className="relative inline-block group">
            <Link
              href="/directory"
              className={cn(
                "flex items-center gap-2 px-3 py-1 border rounded-md font-semibold transition-all hover:opacity-80",
                isScrolled || computedVariant === "default"
                  ? "border-neutral-900"
                  : "border-white"
              )}
              aria-haspopup="menu"
            >
              <Icon icon="mdi:folder-outline" className="text-lg" />
              <span>Directory</span>
              <Icon
                icon="mdi:chevron-down"
                className="text-base transition-transform duration-200 group-hover:rotate-180"
              />
            </Link>

            {/* Dropdown menu */}
            <div
              className="absolute left-0 mt-2 w-56 origin-top rounded-xl border bg-white/95 backdrop-blur shadow-xl ring-1 ring-black/5
                         opacity-0 invisible translate-y-1 scale-95 transition-all duration-200 z-50
                         group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100
                         dark:bg-neutral-900 dark:border-neutral-800"
              role="menu"
              aria-label="Directory menu"
            >
              <ul className="py-2">
                <li>
                  <Link
                    href="/leadgen"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-800 navItem"
                  >
                    <Icon icon="fa6-solid:users-viewfinder" className="text-lg shrink-0 navIcon" />
                    Leadgen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/linkedin-voice"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-800 navItem2"
                  >
                    <Icon icon="iconoir:linkedin" className="text-xl shrink-0 navIcon" />
                    Linkedin voice
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seo-aeo"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-800 navItem3"
                  >
                    <Icon icon="icon-park-outline:ranking-list" className="text-xl shrink-0 navIcon" />
                    SEO and AEO
                  </Link>
                </li>
                <li>
                  <Link
                    href="/more"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-800 navItem4"
                  >
                    <Icon icon="gg:more-r" className="text-xl shrink-0 navIcon" />
                    More
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center h-8">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            ) : user ? (
              <UserAvatar user={user} />
            ) : (
              <Button
                onClick={handleLogin}
                className={cn(
                  "border-0 shadow-sm font-semibold transition-all",
                  isScrolled || computedVariant === "default"
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "bg-white hover:bg-white/90 text-emerald-500"
                )}
                size="sm"
              >
                Login
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(27,200,140)]"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Icon icon="mdi:menu" className="text-2xl" />
        </button>
      </div>

      {/* Mobile sheet with slide transition */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex transition",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeMobile}
          aria-hidden
        />

        {/* Slide-in panel */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 shadow-xl p-4 flex flex-col transform transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-end">
            <button
              className="p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(27,200,140)]"
              aria-label="Close menu"
              onClick={closeMobile}
            >
              <Icon icon="mdi:close" className="text-2xl" />
            </button>
          </div>

          {/* Mobile: Directory accordion */}
          <div className="mt-4">
            <button
              className="w-full flex items-center justify-between px-3 py-2 "
              aria-expanded={mobileDirOpen}
              aria-controls="mobile-directory"
            >
              <span className="flex items-center gap-2 font-bold">
                <Icon icon="mdi:folder-outline" className="text-lg" />
                Directory
              </span>
            
            </button>

            <div
              id="mobile-directory"
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out mt-2",
               "grid-rows-[1fr] opacity-100"
              )}
            >
              <ul className="min-h-0 overflow-hidden rounded-lg border dark:border-neutral-800 bg-white/95 dark:bg-neutral-900">
                <li>
                  <Link
                    href="/leadgen"
                    onClick={closeMobile}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg navItem"
                  >
                    <Icon icon="mdi:account-multiple-plus" className="text-lg shrink-0 navIco" />
                    Leadgen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/linkedin-voice"
                    onClick={closeMobile}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg navItem1"
                  >
                    <Icon icon="mdi:linkedin" className="text-lg shrink-0 navIco" />
                    Linkedin voice
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seo-aeo"
                    onClick={closeMobile}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg navItem2"
                  >
                    <Icon icon="mdi:google-analytics" className="text-lg shrink-0  navIco" />
                    SEO and AEO
                  </Link>
                </li>
                <li>
                  <Link
                    href="/more"
                    onClick={closeMobile}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg navItem3"
                  >
                    <Icon icon="mdi:dots-horizontal-circle" className="text-lg shrink-0 navIco" />
                    More
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile footer: auth */}
          <div className="mt-auto pt-4 border-t dark:border-neutral-800">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <UserAvatar user={user} />
                <div className="text-sm">
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-neutral-500 dark:text-neutral-400">Signed in</div>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                className="w-full border-0 shadow-sm font-semibold transition-all bg-neutral-900 hover:bg-neutral-800 text-white"
                size="sm"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
