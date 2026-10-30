import type { ReactNode } from "react";
import { AuthPage } from "@/components/auth/AuthPage";

export const dynamic = "force-dynamic";

/** Shared by /login and /register so switching between them keeps the page mounted. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthPage>{children}</AuthPage>;
}
