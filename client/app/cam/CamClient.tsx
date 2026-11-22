"use client";

/* eslint-disable @next/next/no-img-element */
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { ASSETS } from "@/constants/assets";
import { Meteors } from "@/components/common/Meteors";
import { depth } from "@/lib/depth";
import { CamPanel } from "@/components/cam/CamPanel";
import { CamFaqSection } from "@/components/cam/CamFaqSection";
import "@/styles/auth.css";

export default function CamClient() {
  return (
    <PageFade className="min-h-dvh">
      <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-black text-parchment">
        {/* Parallax celestial depth backdrop with Meteors */}
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
          style={depth(14, 1.06)}
        />
        <div
          className="pointer-events-none fixed inset-0"
          aria-hidden
          style={depth(14)}
        >
          <Meteors />
        </div>

        <SiteHeader />

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-14 pt-24 md:pb-16 md:pt-28">
          <CamPanel />
          <CamFaqSection />
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}
