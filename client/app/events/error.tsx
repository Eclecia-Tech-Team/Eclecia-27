"use client";

import { useEffect } from "react";
import { GoldActionButton } from "@/components/common/GoldButton";
import { SiteHeader } from "@/components/common/Header";

/** Shown when the event line-up can't be read from the database. */
export default function EventsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-parchment">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-[6vw] pb-16 pt-25 text-center">
        <p className="font-nasyhama text-[26px] uppercase tracking-[0.18em] md:text-[34px]">
          The worlds are out of reach
        </p>
        <p className="max-w-[46ch] font-sans text-[14px] leading-relaxed text-parchment/75 md:text-[16px]">
          We couldn&apos;t load the events just now. Please try again.
        </p>
        <GoldActionButton variant="ghost" onClick={() => retry()}>
          Try again
        </GoldActionButton>
      </main>
    </div>
  );
}
