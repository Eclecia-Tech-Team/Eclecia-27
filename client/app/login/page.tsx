import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Sign in | Eclecia'27",
  description: "Sign in to your Eclecia'27 account.",
  alternates: {
    canonical: "/login",
  },
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthPage mode="login" error={error} />;
}
