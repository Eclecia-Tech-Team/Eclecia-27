import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Eclecia'27",
  description: "Sign in to your Eclecia'27 account.",
  alternates: {
    canonical: "/login",
  },
  robots: { index: false, follow: true },
};

/** The panel lives in the (auth) layout; this route only supplies metadata. */
export default function LoginPage() {
  return null;
}
