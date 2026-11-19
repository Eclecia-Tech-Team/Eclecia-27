/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { TransitionLink } from "./TransitionLink";
import { GoldButton } from "./GoldButton";
import { NAV_ITEMS, SOCIAL_LINKS } from "@/constants/navigation";
import { ASSETS } from "@/constants/assets";
import { getAvatarSrc } from "@/constants/avatars";
import "@/styles/profile.css";

export type SiteHeaderProps = {
  /** 0..1; landing fades it in with scroll. */
  opacity?: number;
};

/** Shared responsive site header with 3 partner logos and 6 main nav items. */
export function SiteHeader({ opacity = 1 }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const hidden = opacity < 0.01;
  const user = session?.user;

  return (
    <>
      {/* Click-outside backdrop overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-85 bg-transparent xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <header
        className="fixed inset-x-0 top-0 flex h-17 items-center justify-between px-[2vw] transition-opacity duration-300 md:h-20.5 md:px-[2.5vw] pointer-events-auto"
        style={{
          opacity,
          zIndex: 95,
          pointerEvents: hidden ? "none" : "auto",
          visibility: hidden ? "hidden" : "visible",
        }}
      >
        {/* Closed: a black-to-transparent wash that runs past the bar and fades out below it.
            Open: match the drawer exactly (same translucency + blur, bar height only) so no dark band. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 -z-10 ${
            mobileMenuOpen ? "h-full bg-black/40 backdrop-blur-md" : "h-[220%]"
          }`}
          style={
            mobileMenuOpen
              ? undefined
              : {
                  background:
                    "linear-gradient(to bottom, rgba(4,4,8,0.88) 0%, rgba(4,4,8,0.62) 35%, rgba(4,4,8,0.28) 65%, rgba(4,4,8,0.08) 85%, rgba(4,4,8,0) 100%)",
                }
          }
        />
        {/* Left Side: 3 Integrated Logos (Shifted left, no hover scale) */}
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 pl-1 md:pl-2">
          {/* HITK Logo -> redirects to official website */}
          <a
            href={SOCIAL_LINKS.websiteHitk}
            target="_blank"
            rel="noopener noreferrer"
            title="Heritage Institute of Technology, Kolkata"
            className="flex items-center"
          >
            <img
              src={ASSETS.cloudinary.hitkLogo}
              alt="HITK Logo"
              className="h-9 w-auto max-w-12 object-contain md:h-12 md:max-w-16"
            />
          </a>

          <span className="h-6 w-px bg-gold/30 md:h-7" aria-hidden />

          {/* Eclecia Symbol Logo */}
          <TransitionLink href="/" className="flex items-center">
            <img
              src={ASSETS.cloudinary.ecleciaLogo}
              alt="Eclecia Logo"
              className="h-10.5 w-auto max-w-13 object-contain md:h-13.5 md:max-w-16"
            />
          </TransitionLink>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden items-center gap-4 xl:flex xl:gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <TransitionLink
                key={item.href}
                href={item.href}
                className={`relative font-taiganja font-normal text-[13px] uppercase tracking-[0.2em] transition-colors py-1 ${
                  isActive ? "text-gold" : "text-parchment/80 hover:text-gold"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
                )}
              </TransitionLink>
            );
          })}
        </nav>

        {/* Right Side: Profile / Join Us & Custom Animated Hamburger */}
        <div className="flex items-center gap-3 pr-1 md:pr-2">
          {/* Desktop Right Action */}
          <div className="hidden xl:block">
            {status === "loading" ? (
              <div className="h-9 w-28 bg-gold/10 border border-gold/20 animate-pulse" />
            ) : user ? (
              <TransitionLink
                href="/profile"
                className="header-profile-btn group"
                title="View Profile Dossier"
                aria-label="View Profile Dossier"
              >
                <div className="relative h-7 w-7 overflow-hidden border border-gold/70 shadow-[0_0_8px_rgba(217,164,65,0.3)] bg-black shrink-0">
                  <img
                    src={getAvatarSrc(user.avatar)}
                    alt={user.username || user.name || "Profile"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 leading-none">
                    Celestial Citizen
                  </span>
                  <span className="font-taiganja text-[12px] uppercase tracking-[0.18em] text-gold transition-colors group-hover:text-parchment max-w-[140px] truncate leading-tight pt-0.5">
                    {user.username || user.name || "Profile"}
                  </span>
                </div>
                {/* <span className="text-gold/70 text-xs pl-0.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-gold">
                  →
                </span> */}
              </TransitionLink>
            ) : (
              <GoldButton href="/login" variant="ghost" size="sm">
                Join Us
              </GoldButton>
            )}
          </div>

          {/* Mobile Profile Icon (when authenticated) */}
          {user && (
            <TransitionLink
              href="/profile"
              className="header-profile-mobile-btn xl:hidden"
              aria-label="Open profile"
              title="Open profile"
            >
              <img
                src={getAvatarSrc(user.avatar)}
                alt={user.username || user.name || "Profile"}
                className="h-6 w-6 object-cover"
              />
            </TransitionLink>
          )}

          {/* Custom Animated Hamburger Button without circular outline */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full transition-all duration-300 hover:opacity-80 xl:hidden"
            aria-label="Toggle navigation menu"
          >
            <span
              className={`h-0.5 w-5 bg-gold rounded-full transition-all duration-300 ${
                mobileMenuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-gold rounded-full transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0 scale-x-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-gold rounded-full transition-all duration-300 ${
                mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Dropdown Menu Container (Transparent blurred overlay matching main theme) */}
      <div
        className={`fixed inset-x-0 top-17 md:top-20.5 z-90 flex flex-col bg-black/40 backdrop-blur-md border-b border-gold/20 px-6 sm:px-10 py-6 xl:hidden transition-all duration-300 ease-in-out origin-top max-h-[calc(100dvh-85px)] overflow-y-auto ${
          mobileMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col divide-y divide-gold/15 border-y border-gold/20">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <TransitionLink
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-3.5 px-2 font-taiganja font-normal text-[15px] sm:text-[17px] uppercase tracking-[0.25em] transition-colors ${
                  isActive
                    ? "text-gold font-semibold"
                    : "text-parchment/80 hover:text-gold"
                }`}
              >
                {item.label}
              </TransitionLink>
            );
          })}
        </nav>

        {/* Join Us CTA in Mobile Drawer (Only shown when not signed in; mobile header already has the profile icon) */}
        {!user && (
          <div className="mt-8 flex justify-center">
            <GoldButton
              href="/login"
              variant="solid"
              size="md"
              onClick={() => setMobileMenuOpen(false)}
            >
              Join Us
            </GoldButton>
          </div>
        )}
      </div>
    </>
  );
}
