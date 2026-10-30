import { TransitionLink } from "./TransitionLink";
import { SiteHeader } from "./Header";
import { SiteFooter } from "./Footer";
import { PageFade } from "./PageFade";
import { ASSETS } from "@/constants/assets";

export interface ComingSoonProps {
  eyebrow: string;
  note?: string;
  backHref?: string;
  backLabel?: string;
}

/** Full-viewport placeholder used by pages that aren't live yet. */
export function ComingSoon({ eyebrow, note, backHref = "/", backLabel = "Back to the fest" }: ComingSoonProps) {
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

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-[6vw] pb-16 pt-25 text-center md:gap-6 md:pt-30">
          <div className="flex flex-col items-center gap-1.5">
            <p className="font-nasyhama font-normal text-[26px] uppercase tracking-[0.18em] text-parchment md:text-[34px]">
              {eyebrow}
            </p>
            <span className="h-0.5 w-12 bg-gold rounded-full" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.cloudinary.comingsoon}
            alt="Coming soon"
            draggable={false}
            className="w-[min(92vw,1040px)] max-w-none select-none md:w-[min(78vw,1040px)]"
          />
          {note && (
            <p className="max-w-[46ch] font-sans text-[14px] leading-relaxed text-parchment/75 md:text-[16px]">
              {note}
            </p>
          )}
          <TransitionLink
            href={backHref}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.35em] text-parchment/60 transition-colors hover:text-gold"
          >
            ← {backLabel}
          </TransitionLink>
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}
