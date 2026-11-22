"use client";

import { SessionProvider } from "next-auth/react";
import { Suspense, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("refCode");
    if (ref) {
      const code = ref.trim().toUpperCase();
      try {
        sessionStorage.setItem("eclecia_ambassador_ref", code);
        localStorage.setItem("eclecia_ambassador_ref", code);
      } catch {}
    }
  }, [searchParams]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      {children}
    </SessionProvider>
  );
}
