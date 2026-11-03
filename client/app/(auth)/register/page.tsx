import type { Metadata } from "next";
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

/** The panel lives in the (auth) layout; this route only supplies metadata. */
export default function RegisterPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "/register",
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
    />
  );
}
