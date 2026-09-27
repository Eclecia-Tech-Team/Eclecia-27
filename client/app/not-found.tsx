import type { Metadata } from "next";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { GoldButton } from "@/components/common/GoldButton";
import { ASSETS } from "@/constants/assets";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Eclecia'27",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <PageFade className="min-h-dvh">
      <div className="relative min-h-dvh flex flex-col justify-between overflow-hidden bg-black text-parchment">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
        />

        <SiteHeader />

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-[6vw] pb-16 pt-25 text-center md:gap-7 md:pt-30">
          <div className="flex flex-col items-center gap-2">
            <p className="font-taiganja text-[13px] uppercase tracking-[0.35em] text-gold/80">
              Error 404
            </p>
            <h1 className="font-display font-semibold text-[56px] leading-none tracking-[-0.02em] text-gold md:text-[96px]">
              Lost in the Eclipse
            </h1>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.cloudinary.divider}
            alt=""
            draggable={false}
            className="pointer-events-none -my-4 w-70 max-w-none select-none md:-my-6 md:w-110"
          />

          <p className="max-w-[48ch] font-sans text-[15px] leading-relaxed text-parchment/75 md:text-[17px]">
            The celestial path you are looking for does not exist or has drifted
            beyond the realm of Eclecia.
          </p>

          <div className="mt-4 flex items-center justify-center">
            <GoldButton href="/" variant="solid" size="md">
              Return to the Fest
            </GoldButton>
          </div>
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}
