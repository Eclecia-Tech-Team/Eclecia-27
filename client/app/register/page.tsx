import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";
import { getBreadcrumbJsonLd, ROUTES } from "@/constants/seo";

const route = ROUTES.find((r) => r.path === "/register")!;

export const metadata: Metadata = {
  title: route.title,
  description: route.description,
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: route.title,
    description: route.description,
    url: "/register",
    type: "website",
  },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "/register",
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AuthPage mode="register" error={error} />
    </>
  );
}
