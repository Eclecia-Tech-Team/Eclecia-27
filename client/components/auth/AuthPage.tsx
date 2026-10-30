/* eslint-disable @next/next/no-img-element */
import { auth, googleEnabled } from "@/auth";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { ASSETS } from "@/constants/assets";
import { AuthPanel } from "./AuthPanel";

const ERRORS: Record<string, string> = {
  use_credentials: "This email already has a password account. Sign in with your email and password.",
  CredentialsSignin: "Invalid email or password",
};

/** Shared server shell for /register and /login: reads the session, renders the panel. */
export async function AuthPage({ mode, error }: { mode: "register" | "login"; error?: string }) {
  const session = await auth();

  return (
    <PageFade className="min-h-dvh">
      <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-black text-parchment">
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
        />
        <SiteHeader />
        <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-28 md:pt-32">
          <AuthPanel
            initialMode={mode}
            googleEnabled={googleEnabled}
            user={session?.user ? { username: session.user.username, email: session.user.email } : null}
            initialError={error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : null}
          />
        </main>
        <SiteFooter />
      </div>
    </PageFade>
  );
}
