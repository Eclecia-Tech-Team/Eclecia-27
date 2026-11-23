import type { Metadata } from "next";
import { OurTaleView } from "@/components/our-tale/OurTaleView";
import { getBreadcrumbJsonLd, ROUTES } from "@/constants/seo";

const route = ROUTES.find((r) => r.path === "/our-tale")!;

export const metadata: Metadata = {
  title: route.title,
  description: route.description,
  alternates: {
    canonical: "/our-tale",
  },
  openGraph: {
    title: route.title,
    description: route.description,
    url: "/our-tale",
    type: "website",
  },
};

export default function OurTalePage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    "/our-tale",
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <OurTaleView />
    </>
  );
}
